/**
 * Per-tenant migration runner — public exports.
 *
 * `runTenantMigrations` is the cross-tenant runner used by
 * `starter-saas tenant migrate`. `DrizzleTenantMigrator` is the per-tenant
 * adapter used by saga step 3 (the provisioning saga's migration step).
 */

export { DrizzleTenantMigrator } from "./drizzle-migrator.js";
export { runTenantMigrations } from "./runner.js";
export type {
  RunTenantMigrationsOptions,
  TenantMigration,
  TenantMigrationOutcome,
  TenantMigrationsReport,
} from "./types.js";
