/**
 * `DrizzleTenantMigrator` — concrete `TenantMigrator` port impl for the
 * 9-step provisioning saga (step 3).
 *
 * Saga step 3 fires once per provisioned tenant; this adapter wraps
 * `runTenantMigrations` filtered to that single tenant. Adopters wire it as:
 *
 *     const migrator = new DrizzleTenantMigrator(db, KIT_MIGRATIONS);
 *     const deps: ProvisioningDeps = {
 *       // ...
 *       migrator,
 *     };
 */

import type { TenantMigrator } from "../provisioning/ports.js";
import type { TenantDb } from "../provisioning/ports.js";

import { runTenantMigrations } from "./runner.js";
import type { TenantMigration } from "./types.js";

export class DrizzleTenantMigrator implements TenantMigrator {
  constructor(
    private readonly db: TenantDb,
    private readonly migrations: readonly TenantMigration[],
  ) {}

  async applyMigrations(args: {
    tenantId: string;
    schemaName: string;
  }): Promise<{ applied: readonly string[] }> {
    const report = await runTenantMigrations(this.db, this.migrations, {
      tenantId: args.tenantId,
    });
    const outcome = report.outcomes[0];
    if (!outcome) {
      throw new Error(
        `DrizzleTenantMigrator: tenant ${args.tenantId} not found in platform.tenants`,
      );
    }
    if (outcome.failures.length > 0) {
      const first = outcome.failures[0];
      throw new Error(
        `Migration ${first?.migrationId} failed for tenant ${args.tenantId}: ${first?.reason}`,
      );
    }
    return { applied: outcome.applied };
  }
}
