/**
 * Soft archive a tenant — stage 1 of the 2-stage archival per ADR-0004 §4.
 *
 * Effect:
 *   - Sets `platform.tenants.archived_at = now()` + `status = 'archived'`
 *   - Inserts an audit row in `platform.tenant_archive_log` capturing the
 *     reason + requesting user
 *
 * Idempotent: re-archiving an already-archived tenant returns
 * `archivedFreshly: false` + no new audit row + no error.
 *
 * The tenant schema + its data are preserved during the soft-archive window
 * (default 30 days per ADR-0004); hard delete happens via
 * `runHardDeleteSweep` after retention.
 */

import { eq } from "drizzle-orm";

import { ArchiveTenantInputSchema, type ArchiveTenantInput } from "../contracts.js";
import { tenantArchiveLog, tenants } from "../db/schema.js";
import type { TenantDb } from "../provisioning/ports.js";
import type { ArchiveTenantResult } from "./types.js";

export async function archiveTenant(
  db: TenantDb,
  input: ArchiveTenantInput,
): Promise<ArchiveTenantResult> {
  const parsed = ArchiveTenantInputSchema.parse(input);

  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: tenants.id,
        archivedAt: tenants.archivedAt,
      })
      .from(tenants)
      .where(eq(tenants.id, parsed.tenantId))
      .limit(1);
    if (rows.length === 0) {
      throw new Error(`archiveTenant: tenant ${parsed.tenantId} not found`);
    }
    const existing = rows[0]!;

    if (existing.archivedAt !== null) {
      // Idempotent — already archived. Return the existing archived_at + no new audit row.
      return {
        archivedFreshly: false,
        archivedAt: existing.archivedAt,
        archiveLogId: null,
      };
    }

    const archivedAt = new Date();
    await tx
      .update(tenants)
      .set({
        archivedAt,
        status: "archived",
        updatedAt: archivedAt,
      })
      .where(eq(tenants.id, parsed.tenantId));

    const [audit] = await tx
      .insert(tenantArchiveLog)
      .values({
        tenantId: parsed.tenantId,
        archivedAt,
        reason: parsed.reason,
        requestingUserId: parsed.requestingUserId,
      })
      .returning({ id: tenantArchiveLog.id });

    return {
      archivedFreshly: true,
      archivedAt,
      archiveLogId: audit?.id ?? null,
    };
  });
}
