# @starter-saas/tenancy

Schema-per-tenant tenancy infrastructure for StarterSaaS. Locked design: [ADR-0004 multi-tenancy](../../docs/architecture/ADR-0004-multi-tenancy.md).

## What's in this package

- **Drizzle schemas** for the platform-layer tenancy tables (sub-PR #2):
  - `platform.tenants` — tenant registry (id + name + slug + plan + status + ownerId + archival fields)
  - `platform.tenant_migrations` — per-tenant per-migration tracking (the migration runner from STORY-015 reads/writes here)
  - `platform.tenant_archive_log` — audit trail of archive + delete operations
  - `platform.saga_instances` — saga-runner persistence (consumed by `DrizzleSagaStore`)
- **Zod boundary contracts** — `CreateTenantInputSchema`, `ArchiveTenantInputSchema`, `TenantSlugSchema`, `TenantPlanSchema`, `TenantStatusSchema`
- **`DrizzleSagaStore`** — production implementation of `SagaStore` from `@starter-saas/saga`. Adopter swaps from `InMemorySagaStore` once they have a Postgres connection.
- **9-step tenant-provisioning saga** (sub-PR #3): `createTenantProvisioningSaga(deps)` + `runTenantProvisioning(runner, deps, input)` — the saga from ADR-0004 §3 wired up as a `SagaDefinition` over pluggable ports.

## The provisioning saga

```text
1. Reserve tenant ID                     → registry.reserveTenant
2. CREATE SCHEMA tenant_{uuid}           → schemaManager.createSchema
3. Run all kit migrations                → migrator.applyMigrations
4. Seed default data                     → seeder.seedDefaults
5. Provision tenant secrets              → secretsProvider.provisionSecretsForTenant
6. Register billing entry                → billingRegistry.registerTenant
7. Mark tenant active                    → registry.markStatus("active")
8. Emit tenant.provisioned event         → eventBus.publish
9. Send welcome email                    → notifications.sendWelcomeEmail
```

Each step has a registered compensating action; on failure at step N, the saga runner walks steps 0..N-1 in reverse calling compensate(). Failure at step 2 (DROP SCHEMA CASCADE) is the "bottom of the rollback stack" — steps 3 + 4 don't register compensations because the DROP subsumes their effects. Failure events (`tenant.provisioning_failed`) are emitted once at saga-level by `runTenantProvisioning`, not redundantly per step.

## Adapter ports

The saga depends on adapters via dependency injection:

| Port | What it does | Default impl |
|---|---|---|
| `TenantRegistry` | CRUD over `platform.tenants` | `DrizzleTenantRegistry` (drizzle-backed) |
| `SchemaManager` | `CREATE`/`DROP SCHEMA` DDL | `DrizzleSchemaManager` (drizzle-backed) |
| `TenantMigrator` | Runs all kit migrations against the new schema | `noopTenantMigrator` (replace via `@starter-saas/cli` in STORY-015) |
| `TenantSeeder` | INSERTs default RBAC roles + brand + settings | `noopTenantSeeder` (adopter overrides) |
| `SecretsProvider` | Provisions per-tenant secrets in cloud Secrets Manager | `noopSecretsProvider` |
| `BillingRegistry` | Registers tenant with billing subsystem | `noopBillingRegistry` |
| `NotificationsSender` | Sends welcome email + activation token | `noopNotificationsSender` |

Adopters wire concrete impls during deploy; the NoOp defaults let the saga be unit-tested + let adopters skip steps they haven't wired yet.

## What's coming in later sub-PRs of STORY-014

- **Sub-PR #4** — `withTenants()` cross-schema wrapper utility + per-tenant rate-limit middleware (Fastify-shaped per ADR-0004).

## Cross-package coupling discipline

Cross-package references use uuid columns WITHOUT DB-level foreign-key constraints — coupling is application-layer (typed across packages via TypeScript), not DB-layer. This avoids the cross-package migration-ordering headache while preserving referential discipline at runtime. Example: `platform.tenants.owner_id` references `platform.users.id` semantically but the DB constraint isn't declared.

## Usage

```typescript
import {
  DrizzleSagaStore,
  DrizzleSchemaManager,
  DrizzleTenantRegistry,
  noopBillingRegistry,
  noopNotificationsSender,
  noopSecretsProvider,
  noopTenantMigrator,
  noopTenantSeeder,
  runTenantProvisioning,
} from "@starter-saas/tenancy";
import { InMemoryEventBus } from "@starter-saas/event-bus";
import { SagaRunner } from "@starter-saas/saga";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as tenancySchema from "@starter-saas/tenancy/db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: tenancySchema });

const sagaStore = new DrizzleSagaStore(db);
const runner = new SagaRunner(sagaStore);

const deps = {
  registry: new DrizzleTenantRegistry(db),
  schemaManager: new DrizzleSchemaManager(db),
  // Swap NoOps for adopter-provided impls during deploy:
  migrator: noopTenantMigrator,
  seeder: noopTenantSeeder,
  secretsProvider: noopSecretsProvider,
  billingRegistry: noopBillingRegistry,
  notifications: noopNotificationsSender,
  eventBus: new InMemoryEventBus(), // → pg-outbox in STORY-017
};

const result = await runTenantProvisioning(runner, deps, {
  name: "Acme Corporation",
  slug: "acme-corp",
  plan: "free",
  ownerId: ownerUuid,
});

if (result.ok) {
  // Tenant is active; result.finalState.tenantId / schemaName populated
} else {
  // Compensations ran; result.failedStep + result.reason explain why
}
```

## Status

**In progress** — [STORY-014](../../project/stories/STORY-014-tenancy-provisioning-saga.md). Schemas + `DrizzleSagaStore` (sub-PR #2) + 9-step provisioning saga (sub-PR #3). Real DB integration tests + `withTenants()` cross-schema wrapper + per-tenant rate-limit middleware land in sub-PR #4.
