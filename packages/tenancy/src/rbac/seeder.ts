/**
 * `DrizzleTenantSeeder` — concrete `TenantSeeder` port impl for the
 * 9-step provisioning saga (step 4).
 *
 * Runs INSIDE the new tenant schema (via `SET LOCAL search_path` in a
 * transaction, same pattern as the migration runner) to seed the default
 * roles + assign the owner as admin:
 *
 *   1. INSERT three roles (admin / member / viewer) with default permission sets
 *   2. INSERT user_roles row mapping the tenant owner → admin role
 *
 * Pre-requisite: the RBAC migration (`RBAC_MIGRATION` from `./ddl.ts`) must
 * have been applied in saga step 3 — adopters compose their migration list
 * as `[RBAC_MIGRATION, ...adopterMigrations]`.
 */

import { sql } from "drizzle-orm";

import type { TenantDb, TenantSeeder } from "../provisioning/ports.js";
import { tenantSchemaName } from "../provisioning/schema-name.js";
import {
  DEFAULT_TENANT_ROLES,
  DEFAULT_TENANT_ROLE_PERMISSIONS,
} from "./types.js";

export class DrizzleTenantSeeder implements TenantSeeder {
  constructor(private readonly db: TenantDb) {}

  async seedDefaults(args: {
    tenantId: string;
    schemaName: string;
    ownerId: string;
    plan: string;
  }): Promise<void> {
    const schemaName = args.schemaName || tenantSchemaName(args.tenantId);
    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`SET LOCAL search_path TO ${sql.identifier(schemaName)}, public`,
      );

      // Bulk-insert the three default roles. Each row has a fresh UUID + its
      // permissions list as a JSONB array.
      for (const roleName of DEFAULT_TENANT_ROLES) {
        const permissions = DEFAULT_TENANT_ROLE_PERMISSIONS[roleName];
        await tx.execute(
          sql`INSERT INTO roles (name, permissions) VALUES (${roleName}, ${JSON.stringify(permissions)}::jsonb)`,
        );
      }

      // Assign owner → admin.
      await tx.execute(
        sql`INSERT INTO user_roles (user_id, role_id) SELECT ${args.ownerId}::uuid, id FROM roles WHERE name = 'admin'`,
      );
    });
  }
}
