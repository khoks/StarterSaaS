/**
 * `requireRole` + `requirePermission` — Fastify-shaped preHandler factories
 * per ADR-0004 + ADR-0007.
 *
 * Structural typing for Fastify request/reply matches the rate-limit middleware
 * pattern (sub-PR #4 of STORY-014) — the kit doesn't depend on Fastify directly.
 *
 * Adopter usage:
 *
 *     const requireAdmin = requireRole(db, ["admin"]);
 *     fastify.addHook("preHandler", requireAdmin);
 *
 *     const requireRead = requirePermission(db, "read:posts");
 *     fastify.addHook("preHandler", requireRead);
 *
 * Both factories accept an `extractTenantId` + `extractUserId` option for
 * pulling the request scope from cookies / JWT claims / headers; defaults
 * read `x-tenant-id` + `x-user-id` headers.
 */

import type { TenantDb } from "../provisioning/ports.js";
import { loadUserRbac } from "./queries.js";
import { permissionMatches } from "./types.js";

/** Structural shape of Fastify's `FastifyRequest` we depend on. */
export interface RbacRequest {
  headers: Record<string, string | string[] | undefined>;
}

/** Structural shape of Fastify's `FastifyReply`. */
export interface RbacReply {
  code(statusCode: number): RbacReply;
  send(payload: unknown): RbacReply;
}

export type RbacHandler = (
  request: RbacRequest,
  reply: RbacReply,
) => Promise<RbacReply | void>;

export interface RbacExtractorOptions {
  /** Pull tenant ID from the request. Default reads `x-tenant-id` header. */
  extractTenantId?: (request: RbacRequest) => string | null;
  /** Pull authenticated user ID from the request. Default reads `x-user-id` header.
   *  Adopters typically replace this with a session/JWT decoder. */
  extractUserId?: (request: RbacRequest) => string | null;
}

function readSingleHeader(
  request: RbacRequest,
  headerName: string,
): string | null {
  const raw = request.headers[headerName];
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function defaultTenantIdExtractor(req: RbacRequest): string | null {
  return readSingleHeader(req, "x-tenant-id");
}

export function defaultUserIdExtractor(req: RbacRequest): string | null {
  return readSingleHeader(req, "x-user-id");
}

/** Returns a Fastify-shaped preHandler that 403s unless the user has at least
 *  one of `requiredRoles` in the tenant scoped by the request. */
export function requireRole(
  db: TenantDb,
  requiredRoles: readonly string[],
  options: RbacExtractorOptions = {},
): RbacHandler {
  const extractTenant = options.extractTenantId ?? defaultTenantIdExtractor;
  const extractUser = options.extractUserId ?? defaultUserIdExtractor;
  const required = new Set(requiredRoles);

  return async (request, reply) => {
    const tenantId = extractTenant(request);
    const userId = extractUser(request);
    if (!tenantId || !userId) {
      return reply.code(401).send({
        error: "unauthenticated",
        message: "Missing tenant or user identity for RBAC check",
      });
    }
    const rbac = await loadUserRbac(db, tenantId, userId);
    if (!rbac) {
      return reply.code(403).send({
        error: "no_roles",
        message: `User ${userId} has no roles in tenant ${tenantId}`,
      });
    }
    const matches = rbac.roles.some((r) => required.has(r.name));
    if (!matches) {
      return reply.code(403).send({
        error: "role_required",
        message: `User ${userId} lacks required role(s): ${[...required].join(", ")}`,
        haveRoles: rbac.roles.map((r) => r.name),
      });
    }
    return;
  };
}

/** Returns a Fastify-shaped preHandler that 403s unless the user has the
 *  required permission (with glob matching — "*" wins everything, "read:*"
 *  grants "read:posts" etc.). */
export function requirePermission(
  db: TenantDb,
  requiredPermission: string,
  options: RbacExtractorOptions = {},
): RbacHandler {
  const extractTenant = options.extractTenantId ?? defaultTenantIdExtractor;
  const extractUser = options.extractUserId ?? defaultUserIdExtractor;

  return async (request, reply) => {
    const tenantId = extractTenant(request);
    const userId = extractUser(request);
    if (!tenantId || !userId) {
      return reply.code(401).send({
        error: "unauthenticated",
        message: "Missing tenant or user identity for RBAC check",
      });
    }
    const rbac = await loadUserRbac(db, tenantId, userId);
    if (!rbac) {
      return reply.code(403).send({
        error: "no_roles",
        message: `User ${userId} has no roles in tenant ${tenantId}`,
      });
    }
    if (!permissionMatches(rbac.permissions, requiredPermission)) {
      return reply.code(403).send({
        error: "permission_required",
        message: `User ${userId} lacks permission: ${requiredPermission}`,
        havePermissions: rbac.permissions,
      });
    }
    return;
  };
}
