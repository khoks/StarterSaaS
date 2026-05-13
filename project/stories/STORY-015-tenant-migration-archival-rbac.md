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
