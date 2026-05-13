/**
 * 2-stage archival + tenant doctor per ADR-0004 §4.
 *
 * Public surface:
 *   - `archiveTenant(db, input)` — stage 1 (soft archive, immediate)
 *   - `restoreTenant(db, input)` — reverse soft archive
 *   - `runHardDeleteSweep(db, schemaManager, options)` — stage 2 (DROP SCHEMA after retention; legal-hold blocks)
 *   - `runTenantDoctor(db, options)` — health + drift report
 */

export { archiveTenant } from "./archive.js";
export { restoreTenant } from "./restore.js";
export {
  runHardDeleteSweep,
  type RunHardDeleteSweepOptions,
} from "./hard-delete.js";
export { runTenantDoctor, type RunTenantDoctorOptions } from "./doctor.js";
export type {
  ArchiveTenantResult,
  DoctorReport,
  DoctorTenantRow,
  HardDeleteCandidate,
  HardDeleteOutcome,
  HardDeleteSweepReport,
  RestoreTenantResult,
} from "./types.js";
