/**
 * `withTenants()` — runs a query function once per tenant schema; aggregates
 * the per-tenant results.
 *
 * Per ADR-0004 §2 Pattern 2 (TS-side wrapper): used for ad-hoc admin queries
 * iterating a subset of tenants. Federated SQL views are explicitly rejected;
 * this is the supported cross-schema query path.
 *
 *     const results = await withTenants(db, ["t1", "t2"], async (ctx) => {
 *       const rows = await ctx.db.execute(
 *         sql`SELECT count(*) FROM ${sql.identifier(ctx.schemaName)}.users`,
 *       );
 *       return rows.length;
 *     });
 *
 * Defaults mirror the migration-runner conventions (ADR-0004 §1):
 *   - 5 parallel tenants at a time (DB-load-friendly without sequentializing)
 *   - continue-on-error (one bad tenant doesn't block N-1 healthy ones)
 *
 * Adopter-tunable for `fail-fast` (CI / staging) + arbitrary parallelism.
 */

import { sql, type SQL } from "drizzle-orm";

import { tenantSchemaName } from "../provisioning/schema-name.js";
import type { TenantDb } from "../provisioning/ports.js";

/** Context passed to each per-tenant query function. */
export interface TenantQueryContext {
  /** The tenant whose schema this invocation is targeting. */
  readonly tenantId: string;
  /** Postgres schema name literal (`tenant_<32hex>`). */
  readonly schemaName: string;
  /** The same DB handle passed to `withTenants` — adopter uses it with
   *  schema-qualified SQL built off `schemaName`. */
  readonly db: TenantDb;
  /** Drizzle `sql` template tag — pre-imported as a convenience. */
  readonly sql: typeof sql;
  /** Helper that returns a `SQL` fragment for a schema-qualified identifier.
   *  Example: `ctx.qualified("users")` → `"tenant_<hex>"."users"`. */
  qualified(relation: string): SQL;
}

export type TenantQueryFn<T> = (ctx: TenantQueryContext) => Promise<T>;

export interface WithTenantsOptions {
  /** Max number of tenants to query in parallel. Default 5 — matches the
   *  per-schema migration runner's parallelism cap from ADR-0004 §1. */
  parallelism?: number;
  /** Failure semantics. Default `"continue-on-error"` — one bad tenant
   *  shouldn't block N-1 healthy ones. `"fail-fast"` aborts on first error
   *  (useful for CI / staging). */
  failureMode?: "continue-on-error" | "fail-fast";
}

export type TenantResult<T> =
  | { tenantId: string; ok: true; value: T }
  | { tenantId: string; ok: false; error: Error };

const DEFAULT_PARALLELISM = 5;

export async function withTenants<T>(
  db: TenantDb,
  tenantIds: readonly string[],
  fn: TenantQueryFn<T>,
  options: WithTenantsOptions = {},
): Promise<TenantResult<T>[]> {
  const parallelism = Math.max(1, options.parallelism ?? DEFAULT_PARALLELISM);
  const failureMode = options.failureMode ?? "continue-on-error";

  const results: TenantResult<T>[] = [];
  let aborted = false;

  for (let i = 0; i < tenantIds.length && !aborted; i += parallelism) {
    const batch = tenantIds.slice(i, i + parallelism);
    const batchResults = await Promise.all(
      batch.map(async (tenantId): Promise<TenantResult<T>> => {
        const schemaName = tenantSchemaName(tenantId);
        try {
          const value = await fn(makeContext(db, tenantId, schemaName));
          return { tenantId, ok: true, value };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          return { tenantId, ok: false, error };
        }
      }),
    );
    results.push(...batchResults);

    if (failureMode === "fail-fast" && batchResults.some((r) => !r.ok)) {
      aborted = true;
    }
  }

  return results;
}

function makeContext(
  db: TenantDb,
  tenantId: string,
  schemaName: string,
): TenantQueryContext {
  return {
    tenantId,
    schemaName,
    db,
    sql,
    qualified(relation: string): SQL {
      return sql`${sql.identifier(schemaName)}.${sql.identifier(relation)}`;
    },
  };
}

/** Split a `TenantResult<T>[]` into successes + failures for downstream
 *  consumption. Adopter UI shows the failures separately + retries them. */
export function partitionTenantResults<T>(
  results: readonly TenantResult<T>[],
): {
  successes: Array<{ tenantId: string; value: T }>;
  failures: Array<{ tenantId: string; error: Error }>;
} {
  const successes: Array<{ tenantId: string; value: T }> = [];
  const failures: Array<{ tenantId: string; error: Error }> = [];
  for (const r of results) {
    if (r.ok) {
      successes.push({ tenantId: r.tenantId, value: r.value });
    } else {
      failures.push({ tenantId: r.tenantId, error: r.error });
    }
  }
  return { successes, failures };
}
