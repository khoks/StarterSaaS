/**
 * Saga primitives — TS-coded state machines with compensation registry.
 *
 * Per D-45 / ADR-0005: event-driven choreography (no central orchestrator).
 * Each step subscribes to the previous step's completion event + business
 * prerequisites; compensating actions are registered alongside each step;
 * failure → walk the compensation registry in reverse order; compensations
 * themselves emit events for observability.
 *
 * In sub-PR #1 we ship the in-process synchronous runner that walks steps
 * directly. The event-driven choreography variant (where steps subscribe to
 * the bus) is a refactor in STORY-017 — same step + compensation contracts.
 */

/** One step in a saga. `execute` advances the state; `compensate` reverses it. */
export interface SagaStep<State> {
  name: string;
  execute: (state: State) => Promise<State>;
  /** Optional rollback action. If absent, this step is treated as a no-op
   *  during compensation (its effects either weren't reversible or weren't
   *  applied yet). */
  compensate?: (state: State) => Promise<void>;
}

/** Saga definition — name + ordered step list. State type is generic and
 *  flows through every step. */
export interface SagaDefinition<State> {
  name: string;
  steps: SagaStep<State>[];
}

/** Per-saga-run snapshot — written to the SagaStore as the saga progresses
 *  so the runner can resume after a process restart (STORY-017 territory) and
 *  the observability dashboards can surface in-flight sagas. */
export interface SagaInstance<State = unknown> {
  instanceId: string;
  sagaName: string;
  status: SagaStatus;
  /** Index of the current step (0-based). `state.steps[currentStep]` is the
   *  step that will run next OR is currently executing. After successful
   *  completion: equals `steps.length`. */
  currentStep: number;
  state: State;
  /** Names of steps that have completed successfully so far. */
  completedSteps: string[];
  /** Names of compensations applied during a rollback. */
  compensatedSteps: string[];
  /** Set when status = "failed" or "compensated". Captured for audit + DLQ. */
  failureReason?: string;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type SagaStatus =
  /** Initial state — just inserted by `create()`. */
  | "pending"
  /** Currently executing forward (one of the steps is mid-flight). */
  | "in-progress"
  /** All steps succeeded. */
  | "completed"
  /** Mid-rollback — compensating registered actions in reverse. */
  | "compensating"
  /** Rollback complete. Saga is dead but cleanly. */
  | "compensated"
  /** Rollback failed OR no compensation registered — manual intervention required. */
  | "failed";

/** Saga store abstraction — adopter swaps in:
 *
 *   - `InMemorySagaStore` for tests + in-process flows (sub-PR #1)
 *   - `DrizzleSagaStore` writing to `platform.saga_instances` (sub-PR #2 of
 *     STORY-014; lands with tenancy schemas)
 */
export interface SagaStore {
  create<State>(instance: SagaInstance<State>): Promise<void>;
  update<State>(instanceId: string, patch: Partial<SagaInstance<State>>): Promise<void>;
  get<State>(instanceId: string): Promise<SagaInstance<State> | null>;
  /** List sagas — for observability dashboards + saga-replay tools. */
  list(filter?: SagaListFilter): Promise<SagaInstance[]>;
}

export interface SagaListFilter {
  sagaName?: string;
  status?: SagaStatus;
}

/** Result of running a saga to completion (or attempted completion). */
export type SagaResult<State> =
  | {
      ok: true;
      instanceId: string;
      finalState: State;
      completedSteps: readonly string[];
    }
  | {
      ok: false;
      instanceId: string;
      failedStep: string;
      reason: string;
      /** Compensations that ran successfully (in reverse-execution order). */
      compensatedSteps: readonly string[];
      /** Set to "compensated" if all compensations ran; "failed" if a
       *  compensation itself errored (manual intervention required). */
      finalStatus: "compensated" | "failed";
    };
