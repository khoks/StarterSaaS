---
id: STORY-014
title: Tenancy schema + 9-step provisioning saga + multi-tenant query primitives
type: story
status: in-progress
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

- [ ] Platform schema tables created via initial Drizzle migration
- [ ] 9-step provisioning saga implemented with compensation registry (per ADR-0004)
- [ ] Saga is idempotent (resume from last incomplete step)
- [ ] Each step emits a step event to event bus (per [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md))
- [ ] Tenant ID format = UUIDv7; schema name = `tenant_{uuid}` literal
- [ ] `withTenants()` wrapper utility ships in `@starter-saas/data`
- [ ] Per-tenant rate-limit middleware in Fastify (default 100 q/s; configurable)
- [ ] PgBouncer transaction-mode pool tested under load
- [ ] Integration test: tenant signup → saga runs end-to-end → tenant active → cross-tenant query blocked

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
