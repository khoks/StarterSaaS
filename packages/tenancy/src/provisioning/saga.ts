/**
 * Tenant provisioning saga — the 9-step ADR-0004 flow as a `SagaDefinition`
 * + a thin wrapper that emits the saga-level `tenant.provisioning_failed`
 * event on any non-success outcome.
 *
 * Usage (adopter, post-deploy):
 *
 *     const deps = { registry, schemaManager, migrator, seeder,
 *                    secretsProvider, billingRegistry, notifications, eventBus };
 *     const runner = new SagaRunner(new DrizzleSagaStore(db));
 *     const result = await runTenantProvisioning(runner, deps, validatedInput);
 *
 *     if (result.ok) {
 *       // tenant active; result.finalState.tenantId is the new tenant
 *     } else {
 *       // saga failed at result.failedStep; tenant.provisioning_failed event
 *       // has been published; result.compensatedSteps lists the rolled-back steps
 *     }
 */

import type { SagaDefinition, SagaResult, SagaRunner } from "@starter-saas/saga";

import type { CreateTenantInput } from "../contracts.js";
import {
  TENANT_PROVISIONING_FAILED_EVENT,
  TENANT_PROVISIONING_TOPIC,
  type TenantProvisioningFailedPayload,
} from "./events.js";
import {
  makeCreateSchemaStep,
  makeEmitProvisionedStep,
  makeMarkActiveStep,
  makeProvisionSecretsStep,
  makeRegisterBillingStep,
  makeReserveTenantIdStep,
  makeRunMigrationsStep,
  makeSeedDefaultsStep,
  makeSendWelcomeStep,
  type ProvisioningDeps,
} from "./steps.js";
import { initialProvisioningState, type ProvisioningState } from "./state.js";

export const TENANT_PROVISIONING_SAGA_NAME = "tenant.provisioning" as const;

export function createTenantProvisioningSaga(
  deps: ProvisioningDeps,
): SagaDefinition<ProvisioningState> {
  return {
    name: TENANT_PROVISIONING_SAGA_NAME,
    steps: [
      makeReserveTenantIdStep(deps),
      makeCreateSchemaStep(deps),
      makeRunMigrationsStep(deps),
      makeSeedDefaultsStep(deps),
      makeProvisionSecretsStep(deps),
      makeRegisterBillingStep(deps),
      makeMarkActiveStep(deps),
      makeEmitProvisionedStep(deps),
      makeSendWelcomeStep(deps),
    ],
  };
}

/** Run the provisioning saga end-to-end; publish a saga-level failure event
 *  on any non-success outcome (compensated or failed).
 *
 *  The failure-event emission is best-effort — if the bus is itself the
 *  reason the saga failed, this publish may also fail; we swallow the
 *  secondary error so the original `SagaResult` is returned uncorrupted.
 *  Adopter observability (per ADR-0006) catches bus errors separately. */
export async function runTenantProvisioning(
  runner: SagaRunner,
  deps: ProvisioningDeps,
  input: CreateTenantInput,
): Promise<SagaResult<ProvisioningState>> {
  const saga = createTenantProvisioningSaga(deps);
  const result = await runner.run(saga, initialProvisioningState(input));

  if (!result.ok) {
    // Pull the latest snapshot so we have tenantId / slug if step 1 completed.
    const instance = await runner.getInstance<ProvisioningState>(result.instanceId);
    const tenantId = instance?.state.tenantId || "";
    const partitionKey = tenantId || input.slug;
    const payload: TenantProvisioningFailedPayload = {
      event: TENANT_PROVISIONING_FAILED_EVENT,
      tenantId,
      slug: input.slug,
      failedStep: result.failedStep,
      reason: result.reason,
      failedAt: new Date(),
    };
    try {
      await deps.eventBus.publish<TenantProvisioningFailedPayload>({
        topic: TENANT_PROVISIONING_TOPIC,
        partitionKey,
        idempotencyKey: `tenant-provisioning:${partitionKey}:failed`,
        payload,
      });
    } catch {
      // Swallow — primary error surfaces via the returned result.
    }
  }

  return result;
}
