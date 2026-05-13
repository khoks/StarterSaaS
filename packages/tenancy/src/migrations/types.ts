/**
 * Per-tenant migration runner — shared types for the runner + the
 * `DrizzleTenantMigrator` saga adapter + the `tenant migrate` CLI subcommand.
 *
 * Per ADR-0004 §1: kit migrations are applied per-tenant against each tenant's
 * Postgres schema. State is recorded in `platform.tenant_migrations` so re-runs
 * are idempotent (already-applied migrations skip).
 */

export interface TenantMigration {
  /** Stable identifier — drizzle-kit `0001_initial_setup` style. The runner
   *  tracks applied migrations by (tenantId, migrationId) in
   *  `platform.tenant_migrations`. */
  id: string;
  /** SQL to execute against the tenant schema. The runner sets the Postgres
   *  `search_path` to the tenant schema before executing so adopter SQL can
   *  use unqualified table names; multiple statements are supported within
   *  the same string. */
  sql: string;
}

export interface RunTenantMigrationsOptions {
  /** Run for a specific tenant only. Omit to iterate all non-archived tenants
   *  in `platform.tenants`. */
  tenantId?: string;
  /** Max tenants to migrate concurrently. Default 5 per ADR-0004 §1. */
  parallelism?: number;
  /** "continue-on-error" (default per ADR-0004 §1) — one bad tenant doesn't
   *  block N-1 healthy ones. "fail-fast" aborts on first failure (CI). */
  failureMode?: "continue-on-error" | "fail-fast";
  /** Print planned migrations without applying — no DB writes happen. */
  dryRun?: boolean;
}

export interface TenantMigrationOutcome {
  tenantId: string;
  schemaName: string;
  /** Migration IDs newly applied this run. */
  applied: readonly string[];
  /** Migration IDs already present in `platform.tenant_migrations` — skipped
   *  for idempotency. */
  alreadyApplied: readonly string[];
  /** Migrations whose SQL execution threw. Empty when `failureMode` is
   *  "fail-fast" + an earlier tenant succeeded but this tenant failed (then
   *  the runner aborts after this tenant). */
  failures: readonly { migrationId: string; reason: string }[];
}

/** Aggregated result returned by `runTenantMigrations`. */
export interface TenantMigrationsReport {
  outcomes: readonly TenantMigrationOutcome[];
  /** True when every per-tenant outcome had zero failures. */
  allSucceeded: boolean;
  /** Set when `failureMode: "fail-fast"` aborted before iterating every tenant. */
  abortedAfter?: string;
}
