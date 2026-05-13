/**
 * Schema-qualified queries against per-tenant `roles` + `user_roles` tables.
 *
 * Used by the RBAC middleware to load a user's effective roles + permissions
 * for a given tenant. Schema-qualified SQL avoids needing a transaction-wrapped
 * search_path change per request (one round-trip per `requireRole` / `requirePermission`
 * call instead of two).
 */

import { sql } from "drizzle-orm";

import type { TenantDb } from "../provisioning/ports.js";
import { tenantSchemaName } from "../provisioning/schema-name.js";
import type { RbacRole, UserRbac } from "./types.js";

interface RoleRow extends Record<string, unknown> {
  id: string;
  name: string;
  permissions: string[] | null;
}

/** Load a user's effective roles + flattened permission set inside a tenant.
 *  Returns `null` when the user has no roles in this tenant. */
export async function loadUserRbac(
  db: TenantDb,
  tenantId: string,
  userId: string,
): Promise<UserRbac | null> {
  const schemaName = tenantSchemaName(tenantId);
  // Drizzle's sql.identifier produces double-quoted Postgres identifiers, which
  // is exactly what we want for the schema name + tables.
  const result = await db.execute<RoleRow>(sql`
    SELECT r.id, r.name, r.permissions
    FROM ${sql.identifier(schemaName)}.user_roles AS ur
    JOIN ${sql.identifier(schemaName)}.roles AS r ON r.id = ur.role_id
    WHERE ur.user_id = ${userId}
  `);
  const rows = extractRows<RoleRow>(result);
  if (rows.length === 0) return null;

  const roles: RbacRole[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    permissions: r.permissions ?? [],
  }));
  const dedupedPermissions = new Set<string>();
  for (const r of roles) {
    for (const p of r.permissions) {
      dedupedPermissions.add(p);
    }
  }

  return {
    userId,
    tenantId,
    roles,
    permissions: [...dedupedPermissions],
  };
}

/** Both postgres-js and pglite expose `.rows` on the QueryResult, but the
 *  TypeScript signature drizzle-orm returns from `db.execute<T>(...)` differs
 *  across adapters. This helper normalizes. */
function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}
