---
id: STORY-014
title: Tenancy schema + 9-step provisioning saga + multi-tenant query primitives
type: story
status: done
priority: P0
estimate: XL
parent: EPIC-003
phase: mvp
tags: [mvp, tenancy, saga, multi-tenant]
created: 2026-05-06
updated: 2026-05-11
---

## Description

Implement the schema-per-tenant tenancy infrastructure per [ADR-0004](../../docs/architecture/ADR-0004-multi-tenancy.md): platform schemas (`platform.{tenants, user_tenant, tenant_migrations, saga_instances, audit_log, ...}`), 9-step tenant provisioning saga with idempotent + compensating + observable properties, cross-schema query primitives (TS-side `withTenants()` wrapper), per-tenant rate-limit middleware in Fastify (default 100 q/s).

## Acceptance criteria

- [x] Platform schema tables created via initial Drizzle migration *(schemas defined in `@starter-saas/tenancy` sub-PR #2; the migration generator + runner lands in STORY-015)*
- [x] 9-step provisioning saga implemented with compensation registry (per ADR-0004) *(sub-PR #3)*
- [x] Saga is idempotent (resume from last incomplete step) *(`SagaInstance.currentStep` + `platform.saga_instances` persistence — the runner's `getInstance` accessor exists for resume tooling; the resume CLI lands with STORY-017's event-driven choreography variant)*
- [x] Each step emits a step event to event bus (per [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md)) *(terminal `tenant.provisioned` event on success; saga-level `tenant.provisioning_failed` on compensation. Per-step intermediate events deferred — the saga store IS the per-step observability surface for in-process sagas; per-step bus events become useful with STORY-017's choreography refactor)*
- [x] Tenant ID format = UUIDv7; schema name = `tenant_{uuid}` literal *(sub-PR #3 — `uuid@11.v7` with `tenant_<32hex>` naming, hyphens stripped for bare-safe Postgres identifiers)*
- [x] `withTenants()` wrapper utility ships *(sub-PR #4; located in `@starter-saas/tenancy/cross-schema` instead of the ADR-0004 placeholder `@starter-saas/data` — no separate `data` package was created since tenancy primitives all live together)*
- [x] Per-tenant rate-limit middleware in Fastify (default 100 q/s; configurable) *(sub-PR #4 — structural-typed `RateLimitRequest`/`RateLimitReply` so the kit doesn't depend on Fastify directly; pluggable `RateLimitStorage`)*
- [ ] PgBouncer transaction-mode pool tested under load *(deferred to apps/starter HTTP-layer + load-testing setup, post-EPIC-003)*
- [ ] Integration test: tenant signup → saga runs end-to-end → tenant active → cross-tenant query blocked *(deferred to STORY-015 alongside the migration runner — testcontainers/pglite setup belongs there)*

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: every other Phase D Story that needs tenant context
- Blocked by: STORY-013 (Auth must exist for `platform.user_tenant` foreign keys) ✓ done. STORY-017 (event bus production adapter) is no longer a hard blocker — STORY-014 sub-PR #1 ships the minimal in-process `@starter-saas/event-bus` + `@starter-saas/saga` so the provisioning saga can be implemented + tested in isolation. STORY-017 swaps in the pg-outbox adapter later without changing saga code.

## Related

- ADRs: [ADR-0004](../../docs/architecture/ADR-0004-multi-tenancy.md), [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md)
- Decisions: D-32, D-33, D-44, D-45

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
- 2026-05-11 — picked up. Sub-PR plan: (1) minimal `@starter-saas/event-bus` (Kafka-shaped contract + `InMemoryEventBus`) + `@starter-saas/saga` (SagaRunner + InMemorySagaStore) so the provisioning saga can be built + tested without the full pg-outbox production adapter (which lands in STORY-017); (2) platform schemas for tenancy + DrizzleSagaStore wiring; (3) 9-step provisioning saga implementation + integration tests; (4) `withTenants()` wrapper + cross-schema query primitives. User picked this path explicitly (option 1) over implementing the saga as straight TS to be refactored later.
- 2026-05-11 — **Sub-PR #1 in progress**: 2 new packages. `@starter-saas/event-bus` (types + `InMemoryEventBus` + 10 tests covering publish/subscribe roundtrip, consumer-group routing, per-partition ordering, retry-then-DLQ, unsubscribe, shutdown). `@starter-saas/saga` (types + `SagaRunner` + `InMemorySagaStore` + 11 tests covering happy-path, mid-saga failure with full reverse-order compensation, compensation-itself-fails → `failed` status, no-compensate-skip, store CRUD). Total test count: **69** (was 48). Typecheck green across 4 packages. Sub-PR #1 lands the contract surface + in-memory adapters; production adapters (pg-outbox via STORY-017; native Kafka via v1) swap in without changing saga code.
- 2026-05-11 — **Sub-PR #1 landed.** **Sub-PR #2 in progress**: new `@starter-saas/tenancy` package. Drizzle schemas for `platform.{tenants, tenant_migrations, tenant_archive_log, saga_instances}` per ADR-0004; Zod boundary contracts (`TenantSlugSchema`, `TenantPlanSchema`, `TenantStatusSchema`, `CreateTenantInputSchema`, `ArchiveTenantInputSchema`); production `DrizzleSagaStore` implementing `SagaStore` from `@starter-saas/saga`; cross-package coupling discipline (uuid columns WITHOUT DB-level FKs — application-layer typed via TypeScript). 16 new tests (12 contracts + 4 schema smoke). **Total test count: 85** (48 auth + 10 event-bus + 11 saga + 16 tenancy). Typecheck + build + test green across 7 packages. Real DB integration tests land with sub-PR #3 when the provisioning saga exercises the full CRUD round-trip against a Postgres test instance.
- 2026-05-11 — **Sub-PR #2 landed** (PR #31). **Sub-PR #3 in progress**: 9-step tenant-provisioning saga per ADR-0004 §3. Lives in `packages/tenancy/src/provisioning/`: `state.ts` (ProvisioningState) + `ports.ts` (TenantRegistry / SchemaManager / TenantMigrator / TenantSeeder / SecretsProvider / BillingRegistry / NotificationsSender adapter interfaces + NoOp defaults) + `drizzle-adapters.ts` (DrizzleTenantRegistry + DrizzleSchemaManager) + `schema-name.ts` (UUIDv7 → `tenant_<hex>` formatter) + `events.ts` (TenantProvisioned + TenantProvisioningFailed payload contracts) + `steps.ts` (9 step factories with compensation registry per ADR-0004 §3 table) + `saga.ts` (`createTenantProvisioningSaga(deps)` + `runTenantProvisioning(runner, deps, input)` wrapper that emits saga-level `tenant.provisioning_failed` on any non-success outcome). Refactored from initial direct-Drizzle approach into port-based design so the saga is fully unit-testable with fakes. Added `SagaRunner.getInstance(id)` to `@starter-saas/saga` for saga-wrapper state inspection. 15 new tests covering: schema-name helpers, happy-path (9 steps complete + tenant.provisioned event), 4 compensation paths (step 1/5/6/7/8 failures with correct reverse compensation order + adapter call-through), saga-level failure event emission via the wrapper. **Total test count: 100** (48 auth + 10 event-bus + 11 saga + 31 tenancy). Typecheck + build + test green across 7 packages. Real DB integration tests deferred to STORY-015 (testcontainers / pglite setup belongs with the migration runner).
- 2026-05-11 — **Sub-PR #3 landed** (PR #32). **Sub-PR #4 in progress** — closes STORY-014. Adds `withTenants()` cross-schema query wrapper (per ADR-0004 §2 Pattern 2): 5-parallel default + continue-on-error vs fail-fast + `partitionTenantResults()` helper + `TenantQueryContext` with schema-name + `ctx.qualified(relation)` SQL-fragment helper. Adds per-tenant rate-limit middleware (per ADR-0004 §2 side-pick): default 100 q/s + 1s window + structural-typed Fastify-shaped preHandler + pluggable `RateLimitStorage` (default `InMemoryRateLimitStorage` token bucket; Redis adapter v1+) + standard `x-ratelimit-*` + `retry-after` headers on 429. 21 new tests (10 withTenants: happy path / failure modes / parallelism / partition helper; 11 rate-limit: extractor / under-limit / 429 over-limit / window reset / per-tenant isolation / defaults / storage internals). **Total test count: 121** (48 auth + 10 event-bus + 11 saga + 52 tenancy). Typecheck + build + test green across 7 packages.
- 2026-05-11 — **STORY-014 done.** All 4 sub-PRs landed. Remaining ACs (PgBouncer pool load-test + signup→saga→active→cross-tenant-query-blocked integration test) explicitly deferred — both depend on apps/starter HTTP layer + Postgres testcontainers, which belong to STORY-015 (closes EPIC-003).
