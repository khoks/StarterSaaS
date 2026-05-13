---
id: STORY-015
title: Tenant migration runner + 2-stage archival + RBAC sketch
type: story
status: in-progress
priority: P0
estimate: L
parent: EPIC-003
phase: mvp
tags: [mvp, tenancy, migration, archival, rbac]
created: 2026-05-06
updated: 2026-05-11
---

## Description

Build the operational tooling for tenant lifecycle per [ADR-0004](../../docs/architecture/ADR-0004-multi-tenancy.md): `@starter-saas/cli tenant migrate` subcommand (default 5 parallel + continue-on-error + `--fail-fast` + `--dry-run`); 2-stage archival (soft archive immediate → hard delete after 30-day default retention; `legal_hold` flag blocks hard delete); `tenant restore` for soft-archive window; RBAC sketch (per-tenant `tenant_xyz.{roles, user_roles}` seeded by saga step 4 — admin / member / viewer); Fastify middleware (`requireRole` / `requirePermission`).

## Acceptance criteria

- [ ] `cli tenant migrate` runs Drizzle migrations against tenant schemas with default 5-parallel + continue-on-error
- [ ] `--fail-fast` flag halts on first failure
- [ ] `--dry-run` shows planned migrations without applying
- [ ] State tracked in `platform.tenant_migrations` (per-tenant per-migration `applied_at` / `failed_at`)
- [ ] Soft archive: `archived_at` set; reads return 410 Gone
- [ ] Hard delete after retention (default 30d, configurable); audit row in `platform.tenant_archive_log`
- [ ] `legal_hold` boolean per tenant blocks hard delete; surfaced in `cli doctor` output
- [ ] `cli tenant restore <id>` reverses soft archive within retention window
- [ ] RBAC: per-tenant roles + permissions tables seeded by provisioning saga
- [ ] `requireRole` / `requirePermission` Fastify middleware works with active tenant context
- [ ] Integration test: full lifecycle (provision → migrate → archive → restore → archive → hard delete with `legal_hold` blocking until cleared)

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: every Phase D Story that adds tenant-schema tables (needs migration runner)
- Blocked by: STORY-014 (tenancy schema + saga must exist first)

## Related

- ADRs: [ADR-0004](../../docs/architecture/ADR-0004-multi-tenancy.md), [ADR-0007](../../docs/architecture/ADR-0007-auth-provider.md)
- Decisions: D-44, D-48

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
- 2026-05-11 — picked up. STORY-014 (the blocker) is now done; all four sub-PRs (event-bus + saga primitives, tenancy schemas + DrizzleSagaStore, 9-step provisioning saga, withTenants + rate-limit middleware) shipped. STORY-015 will introduce `@starter-saas/cli` (per D-42) as the home for the `tenant migrate` / `tenant restore` / `tenant doctor` subcommands; the migration runner replaces `noopTenantMigrator` in the provisioning saga's deps. RBAC tables seeded by saga step 4 land in the same PR cycle alongside the per-tenant `requireRole` / `requirePermission` Fastify middleware. Integration tests will exercise the full lifecycle for the first time against a Postgres test instance (testcontainers / pglite — decision pending).
- 2026-05-11 — **Sub-PR #1 in progress**: foundations. **Decision: PGlite over testcontainers** for the kit's integration tests — no Docker requirement on contributor machines, ~50ms boot vs ~5s, real Postgres SQL via WASM (incl. CREATE SCHEMA + JSONB + UUID + tx). New `@starter-saas/cli` package with commander-based command tree (`--version`/`--help` + `tenant migrate`/`restore`/`doctor` placeholders). New `@starter-saas/tenancy/testing` sub-path export with `createTestDb()` + `applyPlatformSchema()` helpers (DDL inlined to avoid a drizzle-kit dependency in the test harness). 5 new integration tests exercising the harness end-to-end (platform schema creation + 4-table check + CRUD round-trip + slug uniqueness + CREATE SCHEMA + cross-test isolation) + 4 new CLI smoke tests (version + command tree shape + ADR-0004 §1 flag declarations). **Total test count: 130** (48 auth + 10 event-bus + 11 saga + 57 tenancy + 4 cli). Typecheck + build + test green across 9 packages.
- 2026-05-11 — **Sub-PR #1 landed** (PR #34). **Sub-PR #2 in progress**: migration runner. Relaxed `TenantDb` + `SagaStoreDb` types from `PostgresJsDatabase<typeof schema>` to cross-adapter `PgDatabase<PgQueryResultHKT, ...>` so the kit's adapters (`DrizzleTenantRegistry`, `DrizzleSchemaManager`, `DrizzleSagaStore`, new `DrizzleTenantMigrator`) work against both postgres-js (production per D-32) and pglite (test harness). Added `packages/tenancy/src/migrations/`: `runner.ts` with `runTenantMigrations(db, migrations, options)` (5-parallel default + continue-on-error/fail-fast + dry-run + idempotency via `platform.tenant_migrations` lookup + transaction-wrapped per-migration application with `SET LOCAL search_path` so adopter SQL uses unqualified names) + `drizzle-migrator.ts` with `DrizzleTenantMigrator` (concrete `TenantMigrator` port impl for saga step 3, throws on failure to trigger compensation) + `types.ts` (TenantMigration/RunOptions/Outcome/Report). Wired `tenant migrate` CLI subcommand: `--config <path>` loads adopter's MigrateContext { db, migrations } dynamically; `--tenant <id>` / `--parallelism <n>` / `--fail-fast` / `--dry-run` per ADR-0004 §1; prints per-tenant summary lines + failure details. **15 new integration tests** against PGlite: 4 single-tenant (apply + record / idempotency / dry-run / unknown-tenant) + 4 multi-tenant (iterate-all / continue-on-error / fail-fast abort / soft-archived skip) + 3 DrizzleTenantMigrator adapter + **4 end-to-end provisioning saga tests** (happy-path with all 9 steps + schema + tables + tenant.provisioned event + DrizzleSagaStore persistence verified; step-3 failure compensation; saga state survives in saga_instances after compensation; two consecutive provisions yield two separate `active` tenants). **First time the kit exercises the full provisioning saga against a real Postgres** — closes a STORY-014 deferred AC. **Total test count: 145** (48 auth + 10 event-bus + 11 saga + 4 cli + 72 tenancy). Typecheck + build + test green across 9 packages.
