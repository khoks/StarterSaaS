/**
 * Per-tenant RBAC — ADR-0004 step 4 + ADR-0007 RBAC sketch.
 *
 * Public surface:
 *   - `RBAC_MIGRATION` — `TenantMigration` to include in adopter's migration list
 *   - `DrizzleTenantSeeder` — concrete `TenantSeeder` for the provisioning saga's step 4
 *   - `loadUserRbac(db, tenantId, userId)` — query helper for the middleware
 *   - `requireRole(db, roles, options?)` + `requirePermission(db, perm, options?)`
 *     — Fastify-shaped preHandler factories
 *   - `permissionMatches(granted, required)` — glob-aware permission check
 *   - `DEFAULT_TENANT_ROLES` + `DEFAULT_TENANT_ROLE_PERMISSIONS` constants
 */

export { RBAC_MIGRATION, RBAC_MIGRATION_ID } from "./ddl.js";
export { DrizzleTenantSeeder } from "./seeder.js";
export { loadUserRbac } from "./queries.js";
export {
  defaultTenantIdExtractor as defaultRbacTenantIdExtractor,
  defaultUserIdExtractor as defaultRbacUserIdExtractor,
  requirePermission,
  requireRole,
  type RbacExtractorOptions,
  type RbacHandler,
  type RbacReply,
  type RbacRequest,
} from "./middleware.js";
export {
  DEFAULT_TENANT_ROLES,
  DEFAULT_TENANT_ROLE_PERMISSIONS,
  permissionMatches,
  type DefaultTenantRole,
  type RbacRole,
  type UserRbac,
} from "./types.js";
