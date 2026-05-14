/**
 * `authContextPlugin` — Fastify plugin that:
 *
 *   1. Extracts a session token from the request via an adopter-supplied
 *      extractor (default reads the `starter-saas-session` cookie OR the
 *      `Authorization: Bearer <token>` header)
 *   2. Resolves the token to a `Session` (from `@starter-saas/auth`) via an
 *      adopter-supplied resolver — adapter for Auth.js's `session` table,
 *      Redis, JWT verification, etc.
 *   3. Decorates `request.session` (Session | null) + `request.user`
 *      (SessionUser | null) for use in route handlers
 *   4. When `required: true`, emits a 401 for routes missing a valid session
 *
 * The `request.tenantId` decoration is reconciled with the session's
 * `activeTenant.tenantId` when both plugins are registered — the session
 * value wins (it's the authenticated truth; header-based extraction is the
 * fallback for unauthenticated platform endpoints).
 */

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import type { Session, SessionUser } from "@starter-saas/auth";

/** Adopter-supplied function that resolves a session token to a Session.
 *  Returns null for invalid / expired / unknown tokens. */
export type SessionResolver = (token: string) => Promise<Session | null>;

/** Adopter-supplied function that extracts the session token from a request.
 *  Returns null when no token is present. */
export type SessionTokenExtractor = (request: FastifyRequest) => string | null;

export interface AuthContextOptions {
  /** Required — resolves a token to a Session via the adopter's session store. */
  resolveSession: SessionResolver;
  /** Defaults to a cookie + Authorization-bearer reader (see `defaultTokenExtractor`). */
  extractToken?: SessionTokenExtractor;
  /** When true, registered routes that don't have a valid session 401 in
   *  the preHandler. Default false (decorates with null + lets the route
   *  decide). */
  required?: boolean;
  /** Cookie name read by the default extractor. Default `starter-saas-session`. */
  cookieName?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `authContextPlugin`. `null` when no valid session is present. */
    session: Session | null;
    /** Convenience alias for `request.session?.user ?? null`. */
    user: SessionUser | null;
  }
}

const DEFAULT_COOKIE_NAME = "starter-saas-session";

/** Read the session token from the cookie header first, then fall back to
 *  the `Authorization: Bearer <token>` header. Returns null if neither
 *  is present. */
export function defaultTokenExtractor(
  request: FastifyRequest,
  cookieName = DEFAULT_COOKIE_NAME,
): string | null {
  const cookieToken = readCookie(request.headers.cookie, cookieName);
  if (cookieToken) return cookieToken;

  const auth = readSingleHeader(request, "authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const value = auth.slice("bearer ".length).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}

const plugin: FastifyPluginAsync<AuthContextOptions> = async (app, options) => {
  const cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME;
  const extract = options.extractToken ?? ((req) => defaultTokenExtractor(req, cookieName));
  const required = options.required ?? false;

  app.decorateRequest("session", null);
  app.decorateRequest("user", null);

  app.addHook("preHandler", async (request, reply) => {
    const token = extract(request);
    if (token === null) {
      if (required) {
        return reply.code(401).send({
          error: "unauthenticated",
          message: "No session token found in request",
        });
      }
      return;
    }
    let resolved: Session | null = null;
    try {
      resolved = await options.resolveSession(token);
    } catch (err) {
      request.log.warn(
        { err },
        "authContextPlugin: resolveSession threw; treating as unauthenticated",
      );
      resolved = null;
    }
    if (resolved === null) {
      if (required) {
        return reply.code(401).send({
          error: "unauthenticated",
          message: "Session token is invalid or expired",
        });
      }
      return;
    }
    request.session = resolved;
    request.user = resolved.user;
    // Reconcile with tenant-context plugin's request.tenantId if it ran first.
    // The session's activeTenant is the authenticated truth; only overwrite
    // when the tenant-context plugin is registered + the session has one.
    if (
      app.hasRequestDecorator("tenantId") &&
      resolved.activeTenant !== null
    ) {
      request.tenantId = resolved.activeTenant.tenantId;
    }
    return;
  });
};

function readSingleHeader(
  request: FastifyRequest,
  headerName: string,
): string | null {
  const raw = request.headers[headerName];
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      const value = trimmed.slice(name.length + 1);
      // Strip surrounding quotes if present (RFC 6265 allows quoted values).
      const unquoted = value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1)
        : value;
      return unquoted.length > 0 ? decodeURIComponent(unquoted) : null;
    }
  }
  return null;
}

export const authContextPlugin = fp(plugin, {
  name: "starter-saas-auth-context",
  fastify: "5.x",
});

export type AuthContextPluginOptions = AuthContextOptions;

/** Test helper — true iff the plugin has wired `request.session` decoration. */
export function hasAuthContext(app: FastifyInstance): boolean {
  return app.hasRequestDecorator("session");
}
