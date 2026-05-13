/**
 * Per-tenant RBAC types — ADR-0004 step 4 + ADR-0007 RBAC sketch.
 *
 * Two-table model per tenant schema:
 *   - `roles`        — id + name + permissions (jsonb array)
 *   - `user_roles`   — user_id, role_id, assigned_at
 *
 * Full RBAC (hierarchical roles, attribute-based access, custom permissions)
 * is deferred to its own ADR per ADR-0007. The sketch here uses a flat
 * permissions array per role with glob-style strings ("*", "read:*", etc.).
 *
 * Default roles (seeded by `DrizzleTenantSeeder` in saga step 4):
 *   - admin   → permissions: ["*"]                        (everything)
 *   - member  → permissions: ["read:*", "write:own"]       (read all + write own)
 *   - viewer  → permissions: ["read:*"]                    (read-only)
 */

/** Names for the three default roles seeded into each new tenant. */
export const DEFAULT_TENANT_ROLES = ["admin", "member", "viewer"] as const;
export type DefaultTenantRole = (typeof DEFAULT_TENANT_ROLES)[number];

/** Concrete per-role permission lists for the kit defaults. */
export const DEFAULT_TENANT_ROLE_PERMISSIONS: Readonly<Record<DefaultTenantRole, readonly string[]>> = {
  admin: ["*"],
  member: ["read:*", "write:own"],
  viewer: ["read:*"],
};

/** A single per-tenant role row as it lives in `tenant_<hex>.roles`. */
export interface RbacRole {
  id: string;
  name: string;
  permissions: readonly string[];
}

/** A user's effective role + flattened permission set within a tenant. */
export interface UserRbac {
  userId: string;
  tenantId: string;
  roles: readonly RbacRole[];
  /** Deduplicated flat permission set across all the user's roles. */
  permissions: readonly string[];
}

/** Glob-aware permission match. "*" grants everything; "read:*" grants
 *  "read:posts", "read:users" etc.; "read:posts" grants exactly that. */
export function permissionMatches(
  granted: readonly string[],
  required: string,
): boolean {
  if (granted.includes("*")) return true;
  if (granted.includes(required)) return true;
  for (const g of granted) {
    if (g.endsWith(":*")) {
      const prefix = g.slice(0, -1); // "read:" from "read:*"
      if (required.startsWith(prefix)) return true;
    }
  }
  return false;
}
