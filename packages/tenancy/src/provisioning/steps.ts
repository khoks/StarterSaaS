/**
 * The 9 steps of the tenant-provisioning saga per ADR-0004 §3.
 *
 * Each step is a factory `make<Name>Step(deps): SagaStep<ProvisioningState>` —
 * captures dependencies (registry / schema manager / adapters / event bus) in
 * a closure so the saga definition stays pure data.
 *
 * Step → compensating-action map (per ADR-0004 §3):
 *
 *   | # | Step                            | Compensates by                    |
 *   |---|---------------------------------|-----------------------------------|
 *   | 1 | Reserve tenant ID               | DELETE FROM platform.tenants      |
 *   | 2 | CREATE SCHEMA tenant_{uuid}     | DROP SCHEMA tenant_{uuid} CASCADE |
 *   | 3 | Run kit migrations              | (none — step 2 DROP subsumes)     |
 *   | 4 | Seed default data               | (none — step 2 DROP subsumes)     |
 *   | 5 | Provision tenant secrets        | removeSecretsForTenant(secretIds) |
 *   | 6 | Register billing entry          | cancelTenantRegistration(...)     |
 *   | 7 | Mark tenant active              | reset status → provisioning       |
 *   | 8 | Emit tenant.provisioned event   | emit tenant.provisioning_failed   |
 *   | 9 | Send welcome email              | (cannot un-send)                  |
 */

import { v7 as uuidv7 } from "uuid";

import type { EventBus } from "@starter-saas/event-bus";
import type { SagaStep } from "@starter-saas/saga";

import {
  TENANT_PROVISIONED_EVENT,
  TENANT_PROVISIONING_TOPIC,
  type TenantProvisionedPayload,
} from "./events.js";
import type {
  BillingRegistry,
  NotificationsSender,
  SchemaManager,
  SecretsProvider,
  TenantMigrator,
  TenantRegistry,
  TenantSeeder,
} from "./ports.js";
import { tenantSchemaName } from "./schema-name.js";
import type { ProvisioningState } from "./state.js";

export interface ProvisioningDeps {
  registry: TenantRegistry;
  schemaManager: SchemaManager;
  migrator: TenantMigrator;
  seeder: TenantSeeder;
  secretsProvider: SecretsProvider;
  billingRegistry: BillingRegistry;
  notifications: NotificationsSender;
  eventBus: EventBus;
  /** UUIDv7 generator — overridable for deterministic tests. Defaults to the
   *  `uuid` package's v7 generator. */
  generateTenantId?: () => string;
}

// ---------------------------------------------------------------------------
// Step 1 — Reserve tenant ID.
// Generates a UUIDv7, computes schema name, inserts the platform.tenants row
// with status: "provisioning". Compensates by deleting the row.
// ---------------------------------------------------------------------------

export function makeReserveTenantIdStep(
  deps: ProvisioningDeps,
): SagaStep<ProvisioningState> {
  const generateId = deps.generateTenantId ?? uuidv7;
  return {
    name: "reserve-tenant-id",
    async execute(state) {
      const tenantId = generateId();
      const schemaName = tenantSchemaName(tenantId);
      await deps.registry.reserveTenant({
        tenantId,
        name: state.input.name,
        slug: state.input.slug,
        plan: state.input.plan,
        ownerId: state.input.ownerId,
      });
      return { ...state, tenantId, schemaName };
    },
    async compensate(state) {
      if (!state.tenantId) return;
      await deps.registry.deleteTenant({ tenantId: state.tenantId });
    },
  };
}

// ---------------------------------------------------------------------------
// Step 2 — CREATE SCHEMA tenant_{uuid}.
// Compensates by DROP SCHEMA tenant_{uuid} CASCADE — the rollback "floor"
// per ADR-0004 (steps 3 + 4 don't register compensations because this DROP
// subsumes them).
// ---------------------------------------------------------------------------

export function makeCreateSchemaStep(
  deps: ProvisioningDeps,
): SagaStep<ProvisioningState> {
  return {
    name: "create-schema",
    async execute(state) {
      await deps.schemaManager.createSchema({ schemaName: state.schemaName });
      return state;
    },
    async compensate(state) {
      if (!state.schemaName) return;
      await deps.schemaManager.dropSchema({ schemaName: state.schemaName });
    },
  };
}

// ---------------------------------------------------------------------------
// Step 3 — Run kit migrations against the new schema.
// No compensation — step 2's DROP SCHEMA reverses any tables created here.
// ---------------------------------------------------------------------------

export function makeRunMigrationsStep(
  deps: ProvisioningDeps,
): SagaStep<ProvisioningState> {
  return {
    name: "run-migrations",
    async execute(state) {
      await deps.migrator.applyMigrations({
        tenantId: state.tenantId,
        schemaName: state.schemaName,
      });
      return state;
    },
  };
}

// ---------------------------------------------------------------------------
// Step 4 — Seed default data (RBAC roles, brand defaults, settings).
// No compensation — step 2's DROP SCHEMA subsumes.
// ---------------------------------------------------------------------------

export function makeSeedDefaultsStep(
  deps: ProvisioningDeps,
): SagaStep<ProvisioningState> {
  return {
    name: "seed-defaults",
    async execute(state) {
      await deps.seeder.seedDefaults({
        tenantId: state.tenantId,
        schemaName: state.schemaName,
        ownerId: state.input.ownerId,
        plan: state.input.plan,
      });
      return state;
    },
  };
}

// ---------------------------------------------------------------------------
// Step 5 — Provision tenant secrets in the cloud Secrets Manager.
// Compensates by removing the secrets just created.
// ---------------------------------------------------------------------------

export function makeProvisionSecretsStep(
  deps: ProvisioningDeps,
): SagaStep<ProvisioningState> {
  return {
    name: "provision-secrets",
    async execute(state) {
      const { secretIds } = await deps.secretsProvider.provisionSecretsForTenant({
        tenantId: state.tenantId,
      });
      return { ...state, secretIds: [...secretIds] };
    },
    async compensate(state) {
      if (state.secretIds.length === 0) return;
      await deps.secretsProvider.removeSecretsForTenant({
        tenantId: state.tenantId,
        secretIds: state.secretIds,
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Step 6 — Register the tenant with the billing subsystem.
// Compensates by canceling the billing registration.
// ---------------------------------------------------------------------------

export function makeRegisterBillingStep(
  deps: ProvisioningDeps,
): SagaStep<ProvisioningState> {
  return {
    name: "register-billing",
    async execute(state) {
      const { billingId } = await deps.billingRegistry.registerTenant({
        tenantId: state.tenantId,
        plan: state.input.plan,
        ownerId: state.input.ownerId,
      });
      return { ...state, billingId };
    },
    async compensate(state) {
      if (state.billingId === null) return;
      await deps.billingRegistry.cancelTenantRegistration({
        tenantId: state.tenantId,
        billingId: state.billingId,
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Step 7 — Mark tenant active (status: "active").
// Compensates by resetting status to "provisioning" — paired with step 1's
// DELETE on full rollback, but this intermediate state lets observability
// reflect what actually happened.
// ---------------------------------------------------------------------------

export function makeMarkActiveStep(
  deps: ProvisioningDeps,
): SagaStep<ProvisioningState> {
  return {
    name: "mark-active",
    async execute(state) {
      await deps.registry.markStatus({
        tenantId: state.tenantId,
        status: "active",
      });
      return state;
    },
    async compensate(state) {
      if (!state.tenantId) return;
      await deps.registry.markStatus({
        tenantId: state.tenantId,
        status: "provisioning",
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Step 8 — Emit tenant.provisioned event.
// No step-level compensate: emitting tenant.provisioning_failed is a
// saga-level concern (handled by `runTenantProvisioning` in ./saga.ts) so
// failure events fire ONCE regardless of which step failed, not redundantly
// from step-level compensations. Step 9's no-compensate behavior likewise
// relies on the saga-level wrapper to publish the rollback notice.
// ---------------------------------------------------------------------------

export function makeEmitProvisionedStep(
  deps: ProvisioningDeps,
): SagaStep<ProvisioningState> {
  return {
    name: "emit-provisioned-event",
    async execute(state) {
      const payload: TenantProvisionedPayload = {
        event: TENANT_PROVISIONED_EVENT,
        tenantId: state.tenantId,
        slug: state.input.slug,
        name: state.input.name,
        plan: state.input.plan,
        ownerId: state.input.ownerId,
        schemaName: state.schemaName,
        provisionedAt: new Date(),
      };
      await deps.eventBus.publish<TenantProvisionedPayload>({
        topic: TENANT_PROVISIONING_TOPIC,
        partitionKey: state.tenantId,
        idempotencyKey: `tenant-provisioning:${state.tenantId}:provisioned`,
        payload,
      });
      return state;
    },
  };
}

// ---------------------------------------------------------------------------
// Step 9 — Send welcome email / activation token.
// No compensation — cannot un-send an email; adopter notifications subsystem
// is expected to be idempotent on resume (e.g. send-once-per-tenantId).
// ---------------------------------------------------------------------------

export function makeSendWelcomeStep(
  deps: ProvisioningDeps,
): SagaStep<ProvisioningState> {
  return {
    name: "send-welcome-email",
    async execute(state) {
      await deps.notifications.sendWelcomeEmail({
        tenantId: state.tenantId,
        ownerId: state.input.ownerId,
        tenantName: state.input.name,
        tenantSlug: state.input.slug,
      });
      return { ...state, welcomeSentAt: new Date() };
    },
  };
}
