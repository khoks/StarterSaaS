/**
 * Hard-delete sweep — stage 2 of the 2-stage archival per ADR-0004 §4.
 *
 * Finds tenants whose `archived_at` is older than the retention window
 * (default 30 days), DROP SCHEMAs them, records the `deleted_at` timestamp
 * on the archive-log row + flips `platform.tenants.status` to "deleted".
 *
 * `legal_hold = true` blocks hard delete — those tenants stay archived
 * indefinitely until the hold is cleared, surfaced separately in the
 * sweep report + by `tenant doctor`.
 *
 * Production deployment: a scheduled job (cron) runs this daily. The
 * scheduler itself isn't part of MVP-1 (ADR-0004 punts to a separate ADR);
 * adopters can invoke `starter-saas tenant hard-delete` manually until the
 * scheduler lands.
 */

import { and, desc, eq, isNotNull, lt } from "drizzle-orm";

import { tenantArchiveLog, tenants } from "../db/schema.js";
import type { TenantDb } from "../provisioning/ports.js";
import type { SchemaManager } from "../provisioning/ports.js";
import { tenantSchemaName } from "../provisioning/schema-name.js";
import type {
  HardDeleteCandidate,
  HardDeleteOutcome,
  HardDeleteSweepReport,
} from "./types.js";

export interface RunHardDeleteSweepOptions {
  /** Retention window in milliseconds. Default 30 days per ADR-0004 §4. */
  retentionMs?: number;
  /** Mock-able clock for tests. Default `Date.now`. */
  now?: () => Date;
  /** Print planned deletions without applying. */
  dryRun?: boolean;
}

const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function runHardDeleteSweep(
  db: TenantDb,
  schemaManager: SchemaManager,
  options: RunHardDeleteSweepOptions = {},
): Promise<HardDeleteSweepReport> {
  const retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  const now = options.now ?? (() => new Date());
  const dryRun = options.dryRun ?? false;
  const cutoff = new Date(now().getTime() - retentionMs);

  // All tenants whose archived_at predates the cutoff.
  const candidates = await db
    .select({
      id: tenants.id,
      archivedAt: tenants.archivedAt,
      legalHold: tenants.legalHold,
    })
    .from(tenants)
    .where(and(isNotNull(tenants.archivedAt), lt(tenants.archivedAt, cutoff)));

  const eligible: HardDeleteCandidate[] = [];
  const blockedByLegalHold: HardDeleteCandidate[] = [];
  for (const row of candidates) {
    const candidate: HardDeleteCandidate = {
      tenantId: row.id,
      schemaName: tenantSchemaName(row.id),
      archivedAt: row.archivedAt!,
    };
    if (row.legalHold) {
      blockedByLegalHold.push(candidate);
    } else {
      eligible.push(candidate);
    }
  }

  if (dryRun) {
    return {
      candidates: eligible,
      blockedByLegalHold,
      outcomes: [],
      allSucceeded: true,
    };
  }

  const outcomes: HardDeleteOutcome[] = [];
  for (const candidate of eligible) {
    try {
      await schemaManager.dropSchema({ schemaName: candidate.schemaName });
      const deletedAt = now();
      // Update the most-recent archive-log row for this tenant + flip status.
      // Wrapped in a transaction so the row update + status flip are atomic.
      await db.transaction(async (tx) => {
        const latestArchive = await tx
          .select({ id: tenantArchiveLog.id })
          .from(tenantArchiveLog)
          .where(eq(tenantArchiveLog.tenantId, candidate.tenantId))
          .orderBy(desc(tenantArchiveLog.createdAt))
          .limit(1);
        if (latestArchive[0]) {
          await tx
            .update(tenantArchiveLog)
            .set({ deletedAt })
            .where(eq(tenantArchiveLog.id, latestArchive[0].id));
        }
        await tx
          .update(tenants)
          .set({ status: "deleted", updatedAt: deletedAt })
          .where(eq(tenants.id, candidate.tenantId));
      });
      outcomes.push({
        tenantId: candidate.tenantId,
        schemaName: candidate.schemaName,
        ok: true,
      });
    } catch (err) {
      outcomes.push({
        tenantId: candidate.tenantId,
        schemaName: candidate.schemaName,
        ok: false,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    candidates: eligible,
    blockedByLegalHold,
    outcomes,
    allSucceeded: outcomes.every((o) => o.ok),
  };
}
