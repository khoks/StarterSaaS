# @starter-saas/tenancy

Schema-per-tenant tenancy infrastructure for StarterSaaS. Locked design: [ADR-0004 multi-tenancy](../../docs/architecture/ADR-0004-multi-tenancy.md).

## What's in this package (STORY-014 sub-PR #2)

- **Drizzle schemas** for the platform-layer tenancy tables:
  - `platform.tenants` — tenant registry (id + name + slug + plan + status + ownerId + archival fields)
  - `platform.tenant_migrations` — per-tenant per-migration tracking (the migration runner from sub-PR #4 reads/writes here)
  - `platform.tenant_archive_log` — audit trail of archive + delete operations
  - `platform.saga_instances` — saga-runner persistence (consumed by `DrizzleSagaStore`)
- **Zod boundary contracts** — `CreateTenantInputSchema`, `ArchiveTenantInputSchema`, `TenantSlugSchema`, `TenantPlanSchema`, `TenantStatusSchema`
- **`DrizzleSagaStore`** — production implementation of `SagaStore` from `@starter-saas/saga`. Adopter swaps from `InMemorySagaStore` once they have a Postgres connection.

## What's coming in later sub-PRs of STORY-014

- **Sub-PR #3** — the **9-step provisioning saga** per ADR-0004 (reserve ID → CREATE SCHEMA → run kit migrations → seed defaults → provision secrets → register billing → mark active → emit `tenant.provisioned` event → send welcome). Built on `SagaRunner` + `DrizzleSagaStore` from this PR.
- **Sub-PR #4** — `withTenants()` cross-schema wrapper utility + per-tenant rate-limit middleware (Fastify-shaped per ADR-0004).

## Cross-package coupling discipline

Cross-package references use uuid columns WITHOUT DB-level foreign-key constraints — coupling is application-layer (typed across packages via TypeScript), not DB-layer. This avoids the cross-package migration-ordering headache while preserving referential discipline at runtime. Example: `platform.tenants.owner_id` references `platform.users.id` semantically but the DB constraint isn't declared.

## Usage

```typescript
import { DrizzleSagaStore } from "@starter-saas/tenancy";
import { SagaRunner } from "@starter-saas/saga";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as tenancySchema from "@starter-saas/tenancy/db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: tenancySchema });

const sagaStore = new DrizzleSagaStore(db);
const runner = new SagaRunner(sagaStore);

// Run the 9-step provisioning saga (lands in sub-PR #3)
// const result = await runner.run(tenantProvisioningSaga, initialState);
```

## Status

**In progress** — [STORY-014](../../project/stories/STORY-014-tenancy-provisioning-saga.md) sub-PR #2. Schema definitions + `DrizzleSagaStore` impl + contract schemas + smoke tests. Integration tests against a live Postgres land with sub-PR #3 (when the provisioning saga exercises the full DB round-trip).
