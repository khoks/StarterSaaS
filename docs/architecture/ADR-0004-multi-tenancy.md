# ADR-0004 — Multi-tenancy detail (per-schema migration runner + cross-schema queries + tenant-provisioning saga + archival)

- **Status:** accepted
- **Date:** 2026-05-02
- **Deciders:** Rahul Singh Khokhar (project owner)
- **Supersedes:** (none)
- **Superseded by:** (none)

---

## Context

[D-33](../decisions/DECISIONS_LOG.md) locked **schema-per-tenant** in PostgreSQL as the multi-tenancy isolation model. Each adopter's tenants get their own Postgres schema; kit-supplied tables are instantiated per schema. Cross-tenant queries (admin / billing / observability rollups) use schema-qualified queries through dedicated "platform" schemas.

That decision left four implementation questions open:

1. How does the kit run database migrations across N tenant schemas without sequentializing?
2. How does TS application code query across schemas safely?
3. What's the tenant-provisioning flow when a new tenant signs up?
4. What happens when a tenant is deleted / archived?

This ADR closes those four sub-questions, plus six configurability defaults that affect each of them. It builds on D-32 (Drizzle ORM + drizzle-kit + PostgreSQL primary; PgBouncer prod / native pool dev), D-33 (schema-per-tenant), and D-42 (`@starter-saas/cli` deploy CLI).

It also drives ADR-0005 (event bus) — the 9-step provisioning saga is the kit's first concrete saga, and its requirements (ordered events, at-least-once delivery, idempotency keys, dead-letter handling) set the floor for what the bus must support.

## Decision

### 1. Per-schema migration runner

- **Lives in `@starter-saas/cli` as the `tenant migrate` subcommand** — extends D-42's CLI; no new package.
- **Iteration:** reads `platform.tenants` table; iterates each tenant schema in scope (all by default; `--tenant <id>` for a single tenant).
- **State tracking:** `platform.tenant_migrations` table records per-tenant per-migration `applied_at` and `failed_at`.
- **Concurrency:** **5 parallel migrations** by default (DB-load-friendly without sequentializing); adopter-tunable via `starter.config.ts`.
- **Failure policy:** **continue-on-error** by default — log failed tenant, finish remaining tenants, exit non-zero with a per-tenant summary. `--fail-fast` flag for CI / staging.
- **Forward-only:** rollback path is `tenant teardown <id>` (D-42 teardown semantics) — no down-migrations.
- **Dry-run:** `--dry-run` shows planned migrations per tenant without applying.

### 2. Cross-schema query primitives + connection pool isolation

**Pattern stack** (use all three; each for a different need):

| Pattern | Use case | Example |
|---|---|---|
| **Platform schemas** (`platform.tenants`, `platform.billing`, `platform.observability_events`, `platform.tenant_migrations`, `platform.tenant_archive_log`) | Data that's intrinsically cross-tenant — directory, billing rollups, audit, migration state | Schema-qualified queries: `SELECT * FROM platform.tenants WHERE plan = 'pro'` |
| **TS-side `withTenants()` wrapper** | Ad-hoc admin queries iterating a subset of tenants | `withTenants(db, ['t1', 't2'], async (tdb, schema) => tdb.select().from(users))` |
| **~~Federated views~~** | (Rejected — brittle when tenant schemas evolve; one tenant's schema change breaks all dependent views) | — |

**Connection pool isolation** (D-32 already locked PgBouncer prod / native pool dev):

- **PgBouncer in `transaction` pool mode** — distributes connections fairly per-transaction; one tenant cannot hold a connection for the duration of a session.
- **App-side per-tenant rate limit middleware** in Fastify — configurable per-tenant query budget (default: **100 queries/sec/tenant**, adopter-tunable).
- **No per-tenant DB pools** — would explode pool count at >100 tenants and waste server-side connections.

### 3. Tenant provisioning saga (9 steps)

When a new tenant signs up, the kit runs this saga:

```text
1. Reserve tenant ID                                      → platform.tenants (status: provisioning)
2. CREATE SCHEMA tenant_{uuid}                            → DB DDL
3. Run all kit migrations against the new schema          → drizzle-kit + platform.tenant_migrations
4. Seed default data (RBAC roles, settings, brand)        → INSERT statements
5. Provision tenant secrets                               → cloud Secrets Manager (D-41)
6. Register billing entry (if billing enabled)            → platform.billing
7. Mark tenant active                                     → platform.tenants (status: active)
8. Emit tenant.provisioned event                          → event bus (ADR-0005)
9. Send welcome email / activation token                  → notifications subsystem
```

**Saga properties:**

- **Idempotent** — re-running picks up at the last incomplete step. State in `platform.tenants.status` (provisioning / active / archived) and `platform.tenant_migrations` records.
- **Compensating** — failure at step N triggers reverse-order compensation for steps 1..N-1 (each step has a documented compensating action). Default compensation halts at step 2 — schema deletion is the bottom of the rollback stack.
- **Observable** — each step emits a step event via the event bus. Surfaced in observability dashboards (ADR-0006).

**This saga drives ADR-0005's event bus design** (Q2 of STORY-009). The bus must support: ordered events per saga instance, at-least-once delivery, idempotency keys, dead-letter handling.

### 4. Schema deletion / archival

Two-stage:

| Stage | Action |
|---|---|
| **Soft archive** (immediate on adopter request) | Mark `platform.tenants.archived_at = now()`. Schema + data preserved. App-layer reads return 410 Gone for that tenant. `tenant restore <id>` reverses. |
| **Hard delete** (after configurable retention, default **30 days**) | Scheduled job: `DROP SCHEMA tenant_{uuid} CASCADE`. Audit row in `platform.tenant_archive_log` (tenant_id, archived_at, deleted_at, reason, requesting_user). |

**Legal hold** (GDPR right-to-erasure ↔ audit retention reconciliation):

- `platform.tenants.legal_hold` boolean per tenant
- If `legal_hold = true`, hard delete is blocked until cleared
- Surfaced in `tenant doctor` output and in `platform.tenant_archive_log` notes

**Restore window:** during the soft-archive period, `tenant restore <id>` flips `archived_at` back to NULL. After hard delete, restore requires backup-rehydration (out of MVP-1 scope).

### Side picks (configurability defaults)

| Setting | Default | Adopter-tunable? |
|---|---|---|
| Tenant ID format | UUIDv7 (sortable + opaque) | No |
| Schema name pattern | `tenant_{uuid}` literal | No |
| Per-tenant query budget | 100 queries/sec | Yes (`starter.config.ts`) |
| Soft-archive retention | 30 days | Yes |
| Migration parallelism cap | 5 | Yes |
| `platform` schema location | Co-resident in the same Postgres DB | No (single backup story) |

## Considered alternatives

### Migration runner

- **Sequential migration (parallelism = 1)** — rejected: scales linearly with tenant count; 100 tenants × 30s/migration = 50min sequential.
- **Unbounded parallelism** — rejected: DB load spikes; can saturate IO and starve adopter app traffic.
- **Fail-fast as default** — rejected: schema-per-tenant means N independent failure surfaces; one bad tenant shouldn't block 99 healthy ones from advancing.
- **Separate `@starter-saas/migrate` package** — rejected: adds a package with no other purpose; CLI subcommand is sufficient.
- **Down-migrations supported** — rejected: per-tenant rollback is brittle (some tenants may have data the rollback doesn't preserve); forward-only with `tenant teardown` as the explicit destructive path is cleaner.

### Cross-schema query primitives

- **Federated views** (Postgres `CREATE VIEW` aggregating tenant schemas) — rejected: brittle when tenant schemas evolve; one tenant's schema change breaks all dependent views.
- **No platform schemas; everything tenant-local** — rejected: cross-tenant aggregation (admin / billing / observability) requires platform tables; trying to do it tenant-local means N round-trips per query.
- **Per-tenant DB pools** — rejected: at >100 tenants, server-side connection count explodes; PgBouncer transaction-mode handles fairness without per-tenant pools.

### Tenant provisioning

- **In-line transaction (no saga)** — rejected: provisioning crosses transaction boundaries (DB DDL + secrets manager + email send + event emit); a single transaction can't span them.
- **External orchestrator (Temporal / Conductor)** — rejected for MVP-1: adds operational dependency; the kit's own event-bus + saga pattern is sufficient.
- **Fewer steps (e.g., skip explicit billing registration)** — rejected: each step is a real concern; collapsing them means failure modes get tangled.

### Archival

- **Hard delete only (no soft archive)** — rejected: adopters need a "restore for 30 days" window; mistaken-deletion is common in real ops.
- **Soft archive only (no hard delete)** — rejected: data accumulates forever; conflicts with GDPR right-to-erasure.
- **Single-stage with longer retention** — rejected: 30 days is a sensible default; adopter-tunable for adopters with longer retention requirements.
- **No legal hold flag** — rejected: GDPR adopters need an explicit way to suspend deletion for audit / litigation holds.

### Side picks

- **Sequential UUIDs (UUIDv1)** — rejected: leaks creation order to clients; UUIDv7 keeps sortability for indexes without exposing time directly.
- **Auto-increment integer tenant IDs** — rejected: tenant ID enumeration attacks become trivial; UUIDs are opaque.
- **`schema_<id>` or `t_<id>` shorter names** — rejected: readability beats brevity; `tenant_{uuid}` is explicit at the SQL prompt.

## Consequences

### Positive

- **Clean isolation contract** — schema-per-tenant + platform schemas + `withTenants()` wrapper covers all real query patterns without leaking tenant boundaries.
- **Idempotent provisioning** — re-running a failed signup picks up safely; matches the kit's broader idempotency story (deploy script per D-42, migration runner per this ADR).
- **GDPR-friendly archival** — 2-stage with legal-hold flag handles right-to-erasure + audit-retention conflict explicitly.
- **First saga locked** — the 9-step provisioning flow is a concrete, working example that drives ADR-0005's event-bus requirements (ordered events, at-least-once, idempotency keys, DLQ). Future kit sagas (subscription change, billing dunning, churn flow, AI-agent multi-step tasks) will follow the same pattern.
- **PgBouncer transaction mode + app-side rate limit** scales to thousands of tenants without per-tenant pool explosion.

### Negative / accepted tradeoffs

- **Migration runner adds operational complexity** vs. single-DB migration. Accepted: schema-per-tenant requires it; the runner is well-scoped with clear failure modes.
- **`platform` schemas create some coupling** between cross-tenant queries and the platform schema design. Mitigated by treating `platform.*` tables as a stable, slow-evolving API.
- **`withTenants()` wrapper** is an N-query pattern (one query per tenant in scope). For very-large adopters (>10k tenants), ad-hoc admin queries become slow. Mitigation: federate via materialized rollups in `platform.observability_events` for hot admin queries; add Q3 (observability) considerations.
- **Forward-only migrations** mean adopters who deploy a bad migration to all tenants must clean up via either (a) a forward fix-up migration, or (b) `tenant teardown` + restore from backup. No `down` migration story.
- **30-day soft-archive default** holds data adopters expected to delete. Mitigation: documented; adopter-tunable.
- **Per-tenant 100 q/s budget** is an arbitrary default. Mitigation: adopter-tunable; observability surfaces when tenants hit the cap.

### Cross-cutting

- **ADR-0005 (event bus, Q2 of STORY-009)** must satisfy the 9-step saga's needs — this ADR's saga shape is the input.
- **ADR-0006 (observability)** must surface the `platform.observability_events` rollup pattern + per-tenant query-budget metrics + migration-runner per-tenant outcomes.
- **ADR-0007 (auth provider)** must integrate with `platform.tenants` for cross-tenant user lookup.
- **ADR-0011 (LLM Gateway)** must respect per-tenant query budgets — LLM calls count against the budget.
- **ADR-0014 (AI-assisted upstream merge)** must understand schema-per-tenant — when the kit upgrades, migrations run via the migration runner, and the AI-assisted merge agent simulates per-tenant outcomes.

## Implementation notes

- **Migration runner** lives at `packages/cli/src/commands/tenant/migrate.ts`; uses Drizzle Kit's programmatic migration API, not the standalone `drizzle-kit migrate` CLI.
- **`withTenants()` wrapper** is exported from `@starter-saas/data` (the data-layer package); takes `(db, tenantIds, fn)` and returns aggregated results.
- **Saga state machine** lives in `packages/saga` (or wherever ADR-0005 places saga primitives); `platform.tenants.status` is the canonical state field for tenant provisioning specifically.
- **Compensation registry** — each step's compensating action is registered in code; the saga runner walks the compensation registry on failure.
- **Hard-delete scheduler** — runs daily via the kit's job-scheduler subsystem (not yet locked; deferred to ADR-0005 if event-driven, or a separate cron-like ADR if pull-based).
- **`legal_hold` UI surface** — `tenant doctor` lists tenants with active legal holds; admin UI (v1+ adapter per RECOMMENDED_ADDITIONS) surfaces it visibly.

## Revisit triggers

- **Tenant count >10k per adopter** — `withTenants()` wrapper performance + PgBouncer pool sizing need re-evaluation; may need per-region or per-shard tenant routing.
- **Migration runner failures cascade** — if continue-on-error means too many tenants drift, may need a stricter promotion gate or canary cohort runs.
- **GDPR / regulatory changes** — retention periods, legal-hold semantics may need updates.
- **Saga complexity grows** — if individual sagas exceed ~15 steps or need branching/joining, may need to upgrade from the kit's own saga primitives to an external orchestrator (Temporal / Conductor).
- **Cross-schema query patterns evolve** — if adopters request federated views despite the rejection here, revisit with a constrained-schema-evolution discipline.
