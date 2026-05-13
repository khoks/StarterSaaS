# @starter-saas/cli

The `starter-saas` command-line tool per [D-42](../../CLAUDE.md) + [ADR-0004 §1](../../docs/architecture/ADR-0004-multi-tenancy.md).

## What's in this package (STORY-015 sub-PR #1)

- Package skeleton + commander-based command tree
- `starter-saas --version` / `--help`
- `starter-saas tenant` command group with placeholder subcommands (`migrate`, `restore`, `doctor`) — wiring lands in subsequent sub-PRs

## What's coming in later sub-PRs of STORY-015

- **Sub-PR #2** — `tenant migrate` real implementation: applies Drizzle migrations across tenant schemas with the 5-parallel + continue-on-error semantics from ADR-0004 §1. Adds `DrizzleTenantMigrator` (concrete impl of the `TenantMigrator` port from `@starter-saas/tenancy`).
- **Sub-PR #3** — 2-stage archival (soft → 30-day hard delete with `legal_hold` block); `tenant restore`; `tenant doctor`.
- **Sub-PR #4** — per-tenant RBAC tables seeded by saga step 4; `requireRole` / `requirePermission` Fastify middleware.

## Run locally

```bash
# From the monorepo root, after `npm install`:
npx starter-saas --version
npx starter-saas tenant --help
```

## Status

**In progress** — [STORY-015](../../project/stories/STORY-015-tenant-migration-archival-rbac.md). Skeleton only; subcommands print "not implemented yet" until the corresponding sub-PR lands.
