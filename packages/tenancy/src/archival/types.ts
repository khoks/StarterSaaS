/**
 * Archival result types per ADR-0004 §4.
 *
 * Two-stage archival: soft archive (immediate, `archived_at` set) → hard
 * delete (after retention, default 30 days). The `legal_hold` flag blocks
 * hard delete until cleared.
 */

export interface ArchiveTenantResult {
  /** True when this call flipped `archived_at` from NULL → now. False when
   *  the tenant was already archived (idempotent). */
  archivedFreshly: boolean;
  /** Timestamp recorded in `platform.tenants.archived_at`. */
  archivedAt: Date;
  /** New audit row ID in `platform.tenant_archive_log` — null when no new row
   *  was inserted (already-archived case). */
  archiveLogId: string | null;
}

export interface RestoreTenantResult {
  /** True when this call flipped `archived_at` back to NULL. False when the
   *  tenant was already active (idempotent) or has been hard-deleted (then
   *  `error` carries the explanation). */
  restored: boolean;
  /** Set when restore was refused. Common cases:
   *    - "not-found": tenant ID not in platform.tenants
   *    - "hard-deleted": tenant's schema has been dropped, restore impossible
   *    - "not-archived": tenant has no archived_at to clear (idempotent OK)
   */
  reason?: "not-found" | "hard-deleted" | "not-archived";
}

export interface HardDeleteCandidate {
  tenantId: string;
  schemaName: string;
  archivedAt: Date;
}

export interface HardDeleteOutcome {
  tenantId: string;
  schemaName: string;
  ok: boolean;
  /** Set when ok = false. */
  reason?: string;
}

export interface HardDeleteSweepReport {
  /** Tenants past retention that were eligible (excludes legal-hold + active). */
  candidates: readonly HardDeleteCandidate[];
  /** Tenants past retention but blocked by legal_hold = true. */
  blockedByLegalHold: readonly HardDeleteCandidate[];
  /** Per-tenant outcome from the actual DROP SCHEMA + audit-row writes. */
  outcomes: readonly HardDeleteOutcome[];
  /** True when every eligible candidate was hard-deleted cleanly. */
  allSucceeded: boolean;
}

export interface DoctorTenantRow {
  tenantId: string;
  slug: string;
  status: string;
  archivedAt: Date | null;
  legalHold: boolean;
}

export interface DoctorReport {
  /** All tenants in `platform.tenants` regardless of status. */
  tenants: readonly DoctorTenantRow[];
  /** Tenants with `legal_hold = true` — surface prominently in ops UX. */
  legalHolds: readonly DoctorTenantRow[];
  /** Soft-archived tenants past their retention window — ready for hard delete. */
  readyForHardDelete: readonly DoctorTenantRow[];
  /** Schemas matching `tenant_<hex>` that have NO row in `platform.tenants`
   *  (orphans — e.g. failed-mid-saga without compensation, or manual cleanup
   *  gone wrong). Listed as `tenant_<hex>`. */
  orphanedSchemas: readonly string[];
  /** Tenants in `platform.tenants` with `status: active|provisioning` whose
   *  schema doesn't exist (e.g. mid-saga death between step 1 + step 2). */
  missingSchemas: readonly { tenantId: string; expectedSchema: string }[];
}
