/**
 * `runTenantMigrations` — applies a list of migrations across N tenant schemas
 * per ADR-0004 §1.
 *
 * Semantics:
 *   - Reads `platform.tenants` to discover tenants in scope (non-archived
 *     unless `tenantId` option filters to one)
 *   - For each tenant, looks up `platform.tenant_migrations` to skip already-
 *     applied migration IDs (idempotency)
 *   - Sets `search_path` to the tenant schema before each migration so adopter
 *     SQL uses unqualified names
 *   - Records `applied_at` on success, `failed_at` + `failure_reason` on error
 *   - Respects `parallelism` (default 5) + `failureMode` ("continue-on-error"
 *     default, "fail-fast" abort-on-error)
 *   - `dryRun` returns the planned outcomes without writing to the DB
 */

import { eq, inArray, isNull, sql } from "drizzle-orm";

import { tenantMigrations, tenants } from "../db/schema.js";
import type { TenantDb } from "../provisioning/ports.js";
import { tenantSchemaName } from "../provisioning/schema-name.js";
import type {
  RunTenantMigrationsOptions,
  TenantMigration,
  TenantMigrationOutcome,
  TenantMigrationsReport,
} from "./types.js";

const DEFAULT_PARALLELISM = 5;

export async function runTenantMigrations(
  db: TenantDb,
  migrations: readonly TenantMigration[],
  options: RunTenantMigrationsOptions = {},
): Promise<TenantMigrationsReport> {
  const parallelism = Math.max(1, options.parallelism ?? DEFAULT_PARALLELISM);
  const failureMode = options.failureMode ?? "continue-on-error";
  const dryRun = options.dryRun ?? false;

  const targets = await discoverTargets(db, options.tenantId);

  const outcomes: TenantMigrationOutcome[] = [];
  let aborted = false;
  let abortedAfter: string | undefined;

  for (let i = 0; i < targets.length && !aborted; i += parallelism) {
    const batch = targets.slice(i, i + parallelism);
    const batchOutcomes = await Promise.all(
      batch.map((t) => applyForTenant(db, t.tenantId, migrations, dryRun)),
    );
    outcomes.push(...batchOutcomes);

    if (failureMode === "fail-fast") {
      const firstFailure = batchOutcomes.find((o) => o.failures.length > 0);
      if (firstFailure) {
        aborted = true;
        abortedAfter = firstFailure.tenantId;
      }
    }
  }

  const allSucceeded = outcomes.every((o) => o.failures.length === 0);
  return abortedAfter === undefined
    ? { outcomes, allSucceeded }
    : { outcomes, allSucceeded, abortedAfter };
}

async function discoverTargets(
  db: TenantDb,
  filterTenantId: string | undefined,
): Promise<readonly { tenantId: string }[]> {
  if (filterTenantId) {
    const row = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, filterTenantId))
      .limit(1);
    return row.length === 0 ? [] : [{ tenantId: row[0]!.id }];
  }
  // All non-archived tenants. `archived_at IS NULL` excludes soft-archived rows.
  const rows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(isNull(tenants.archivedAt));
  return rows.map((r) => ({ tenantId: r.id }));
}

async function applyForTenant(
  db: TenantDb,
  tenantId: string,
  migrations: readonly TenantMigration[],
  dryRun: boolean,
): Promise<TenantMigrationOutcome> {
  const schemaName = tenantSchemaName(tenantId);

  // Look up previously-applied migrations for idempotency.
  const migrationIds = migrations.map((m) => m.id);
  const previouslyApplied =
    migrationIds.length === 0
      ? []
      : await db
          .select({ migrationId: tenantMigrations.migrationId })
          .from(tenantMigrations)
          .where(inArray(tenantMigrations.migrationId, migrationIds));
  const appliedSet = new Set(
    previouslyApplied
      .filter((row) => row.migrationId)
      .map((row) => row.migrationId),
  );

  const alreadyApplied: string[] = [];
  const applied: string[] = [];
  const failures: { migrationId: string; reason: string }[] = [];

  for (const migration of migrations) {
    if (appliedSet.has(migration.id)) {
      alreadyApplied.push(migration.id);
      continue;
    }
    if (dryRun) {
      applied.push(migration.id);
      continue;
    }
    try {
      // Wrap in a transaction so `SET LOCAL search_path` actually scopes to
      // the tenant schema (outside a transaction it's a no-op + warning).
      // The transaction also makes the migration atomic — if the SQL fails
      // mid-way the schema is reverted with the tenant_migrations success row.
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`SET LOCAL search_path TO ${sql.identifier(schemaName)}, public`,
        );
        await tx.execute(sql.raw(migration.sql));
        await tx.insert(tenantMigrations).values({
          tenantId,
          migrationId: migration.id,
        });
      });
      applied.push(migration.id);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ migrationId: migration.id, reason });
      // Record the failure OUTSIDE the rolled-back transaction so observability
      // dashboards still see it. Best-effort — swallow secondary errors.
      try {
        await db.insert(tenantMigrations).values({
          tenantId,
          migrationId: migration.id,
          failedAt: new Date(),
          failureReason: reason,
        });
      } catch {
        /* swallow — primary failure already captured */
      }
      // Stop applying migrations for this tenant on first error — partial
      // application would leave the tenant in an inconsistent state.
      break;
    }
  }

  return {
    tenantId,
    schemaName,
    applied,
    alreadyApplied,
    failures,
  };
}
