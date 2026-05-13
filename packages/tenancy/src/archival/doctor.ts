/**
 * `runTenantDoctor` — health report on tenant state per ADR-0004.
 *
 * Surfaces:
 *   - All tenants with status / archived_at / legal_hold
 *   - Tenants with active legal_hold (prominent in CLI output)
 *   - Tenants past their retention window (ready for hard delete)
 *   - Orphaned `tenant_<hex>` schemas with no matching tenant row
 *   - Tenants whose schemas don't exist (mid-saga death scenarios)
 *
 * Returns a structured report; the CLI formats it for human reading.
 */

import { sql } from "drizzle-orm";

import { tenants } from "../db/schema.js";
import type { TenantDb } from "../provisioning/ports.js";
import { isTenantSchemaName, tenantSchemaName } from "../provisioning/schema-name.js";
import type { DoctorReport, DoctorTenantRow } from "./types.js";

export interface RunTenantDoctorOptions {
  /** Retention window in milliseconds for the "ready for hard delete" list.
   *  Default 30 days per ADR-0004 §4. */
  retentionMs?: number;
  /** Mock-able clock for tests. Default `Date.now`. */
  now?: () => Date;
}

const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function runTenantDoctor(
  db: TenantDb,
  options: RunTenantDoctorOptions = {},
): Promise<DoctorReport> {
  const retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  const now = options.now ?? (() => new Date());
  const cutoff = new Date(now().getTime() - retentionMs);

  const rows: DoctorTenantRow[] = (
    await db
      .select({
        tenantId: tenants.id,
        slug: tenants.slug,
        status: tenants.status,
        archivedAt: tenants.archivedAt,
        legalHold: tenants.legalHold,
      })
      .from(tenants)
  ).map((r) => ({
    tenantId: r.tenantId,
    slug: r.slug,
    status: r.status,
    archivedAt: r.archivedAt,
    legalHold: r.legalHold,
  }));

  const legalHolds = rows.filter((r) => r.legalHold);

  // Past-retention soft-archived tenants (excluding legal-hold blockers).
  const readyForHardDelete = rows.filter(
    (r) =>
      r.archivedAt !== null &&
      r.archivedAt < cutoff &&
      !r.legalHold &&
      r.status !== "deleted",
  );

  // Compare platform.tenants vs information_schema.schemata to spot drift.
  const schemaRows = await db.execute<{ schema_name: string }>(
    sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`,
  );
  const schemasOnDisk = new Set(
    (schemaRows as unknown as { rows: { schema_name: string }[] }).rows
      .map((r) => r.schema_name)
      .filter((name) => isTenantSchemaName(name)),
  );
  const expectedSchemas = new Map<string, string>(
    rows.map((r) => [tenantSchemaName(r.tenantId), r.tenantId]),
  );

  const orphanedSchemas = [...schemasOnDisk]
    .filter((s) => !expectedSchemas.has(s))
    .sort();
  const missingSchemas = rows
    .filter(
      (r) =>
        (r.status === "active" || r.status === "provisioning") &&
        !schemasOnDisk.has(tenantSchemaName(r.tenantId)),
    )
    .map((r) => ({
      tenantId: r.tenantId,
      expectedSchema: tenantSchemaName(r.tenantId),
    }));

  return {
    tenants: rows,
    legalHolds,
    readyForHardDelete,
    orphanedSchemas,
    missingSchemas,
  };
}
