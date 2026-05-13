/**
 * Restore a soft-archived tenant — reverse `archived_at` to NULL during the
 * retention window per ADR-0004 §4.
 *
 * Refuses when:
 *   - The tenant doesn't exist (`reason: "not-found"`)
 *   - The tenant has been hard-deleted (status: "deleted") — restore from
 *     hard delete requires backup rehydration, out of MVP-1 scope
 *     (`reason: "hard-deleted"`)
 *   - The tenant is already active (`archived_at IS NULL`) — idempotent,
 *     no error, `restored: false` + `reason: "not-archived"`
 */

import { eq } from "drizzle-orm";

import { RestoreTenantInputSchema, type RestoreTenantInput } from "../contracts.js";
import { tenants } from "../db/schema.js";
import type { TenantDb } from "../provisioning/ports.js";
import type { RestoreTenantResult } from "./types.js";

export async function restoreTenant(
  db: TenantDb,
  input: RestoreTenantInput,
): Promise<RestoreTenantResult> {
  const parsed = RestoreTenantInputSchema.parse(input);

  const rows = await db
    .select({
      id: tenants.id,
      status: tenants.status,
      archivedAt: tenants.archivedAt,
    })
    .from(tenants)
    .where(eq(tenants.id, parsed.tenantId))
    .limit(1);
  if (rows.length === 0) {
    return { restored: false, reason: "not-found" };
  }
  const existing = rows[0]!;
  if (existing.status === "deleted") {
    return { restored: false, reason: "hard-deleted" };
  }
  if (existing.archivedAt === null) {
    return { restored: false, reason: "not-archived" };
  }

  await db
    .update(tenants)
    .set({
      archivedAt: null,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, parsed.tenantId));

  return { restored: true };
}
