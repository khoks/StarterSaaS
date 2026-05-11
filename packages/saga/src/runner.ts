/**
 * SagaRunner — executes a SagaDefinition with persistence + compensation.
 *
 * Per ADR-0005, sagas in MVP-1 are event-driven choreography. This in-process
 * runner is a synchronous shortcut for tests + small flows where all the
 * steps live in the same process. The same `SagaDefinition` works under the
 * event-driven runner (STORY-017) — only the dispatch changes.
 *
 * Failure semantics:
 *   - Step N fails → status: "compensating"
 *   - Walk compensations for steps 0..N-1 in REVERSE order
 *   - If all compensations succeed → status: "compensated"
 *   - If any compensation itself fails → status: "failed" (manual intervention)
 */

import { randomUUID } from "node:crypto";

import type {
  SagaDefinition,
  SagaInstance,
  SagaResult,
  SagaStep,
  SagaStore,
} from "./types.js";

export class SagaRunner {
  constructor(private readonly store: SagaStore) {}

  async run<State>(
    saga: SagaDefinition<State>,
    initialState: State,
    options: RunOptions = {},
  ): Promise<SagaResult<State>> {
    const instanceId = options.instanceId ?? randomUUID();
    const now = new Date();

    const instance: SagaInstance<State> = {
      instanceId,
      sagaName: saga.name,
      status: "pending",
      currentStep: 0,
      state: initialState,
      completedSteps: [],
      compensatedSteps: [],
      startedAt: now,
      updatedAt: now,
    };
    await this.store.create(instance);

    let state = initialState;
    const completedSteps: string[] = [];

    await this.store.update<State>(instanceId, { status: "in-progress" });

    for (let i = 0; i < saga.steps.length; i++) {
      const step = saga.steps[i]!;
      try {
        await this.store.update<State>(instanceId, {
          currentStep: i,
          updatedAt: new Date(),
        });
        state = await step.execute(state);
        completedSteps.push(step.name);
        await this.store.update<State>(instanceId, {
          state,
          completedSteps: [...completedSteps],
          updatedAt: new Date(),
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        return this.compensate(saga, instanceId, state, completedSteps, step.name, reason, i);
      }
    }

    await this.store.update<State>(instanceId, {
      status: "completed",
      currentStep: saga.steps.length,
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      ok: true,
      instanceId,
      finalState: state,
      completedSteps,
    };
  }

  /** Walk completed steps in REVERSE, calling compensate() on each. */
  private async compensate<State>(
    saga: SagaDefinition<State>,
    instanceId: string,
    state: State,
    completedSteps: string[],
    failedStep: string,
    reason: string,
    failedAt: number,
  ): Promise<SagaResult<State>> {
    await this.store.update<State>(instanceId, {
      status: "compensating",
      failureReason: reason,
      updatedAt: new Date(),
    });

    const stepsByName = new Map<string, SagaStep<State>>(
      saga.steps.map((s) => [s.name, s]),
    );
    const compensatedSteps: string[] = [];

    // Reverse-order compensation for steps 0..failedAt-1
    for (let i = failedAt - 1; i >= 0; i--) {
      const completedName = completedSteps[i];
      if (completedName === undefined) {
        continue;
      }
      const step = stepsByName.get(completedName);
      if (!step?.compensate) {
        continue;
      }
      try {
        await step.compensate(state);
        compensatedSteps.push(completedName);
        await this.store.update<State>(instanceId, {
          compensatedSteps: [...compensatedSteps],
          updatedAt: new Date(),
        });
      } catch (compErr) {
        // Compensation itself failed — bail out with status: "failed" (manual intervention).
        const compReason =
          compErr instanceof Error ? compErr.message : String(compErr);
        await this.store.update<State>(instanceId, {
          status: "failed",
          failureReason: `${reason}; compensation failed at ${completedName}: ${compReason}`,
          completedAt: new Date(),
          updatedAt: new Date(),
        });
        return {
          ok: false,
          instanceId,
          failedStep,
          reason,
          compensatedSteps,
          finalStatus: "failed",
        };
      }
    }

    await this.store.update<State>(instanceId, {
      status: "compensated",
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      ok: false,
      instanceId,
      failedStep,
      reason,
      compensatedSteps,
      finalStatus: "compensated",
    };
  }
}

export interface RunOptions {
  /** Override the generated UUID — useful for deterministic tests. */
  instanceId?: string;
}
