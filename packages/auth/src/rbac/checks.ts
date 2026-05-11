/**
 * RBAC helpers — pure functions the adopter composes into HTTP middleware.
 *
 * Per ADR-0007, full RBAC subsystem (custom permissions, hierarchical roles,
 * attribute-based access) is deferred to its own ADR. This module ships the
 * sketch needed for MVP-1: role-label checks against the user's active
 * tenant membership.
 *
 * Default seeded roles per ADR-0004 step 4: `admin`, `member`, `viewer`,
 * plus the cross-tenant `platform_admin` super-role.
 */

import type { Session } from "../contracts/session.js";

/** Reserved cross-tenant super-role; used by the Coworker platform per ADR-0012. */
export const PLATFORM_ADMIN_ROLE = "platform_admin" as const;

/** Default per-tenant role labels seeded by the provisioning saga. */
export const DEFAULT_TENANT_ROLES = ["admin", "member", "viewer"] as const;
export type DefaultTenantRole = (typeof DEFAULT_TENANT_ROLES)[number];

export type RoleCheckResult =
  | { ok: true }
  | { ok: false; reason: "no-active-tenant" | "role-mismatch" };

/**
 * Does the active session have one of the named roles in the active tenant?
 * Adopters compose this into Fastify middleware:
 *
 *     const result = hasAnyRole(session, ["admin"]);
 *     if (!result.ok) return reply.status(403).send({ error: result.reason });
 */
export function hasAnyRole(session: Session, allowed: readonly string[]): RoleCheckResult {
  if (session.activeTenant === null) {
    return { ok: false, reason: "no-active-tenant" };
  }
  if (allowed.includes(session.activeTenant.roleLabel)) {
    return { ok: true };
  }
  return { ok: false, reason: "role-mismatch" };
}

/**
 * Convenience for the common "platform admin only" check (cross-tenant
 * privileges). The session's active tenant may be ANY tenant — what matters
 * is whether the role label there is the reserved platform_admin value.
 */
export function isPlatformAdmin(session: Session): boolean {
  return session.activeTenant?.roleLabel === PLATFORM_ADMIN_ROLE;
}
