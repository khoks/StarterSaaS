/**
 * `tenantContextPlugin` — Fastify plugin that:
 *
 *   1. Decorates `request.tenantId` with the active tenant scope extracted via
 *      an adopter-supplied (or default header-reader) extractor function
 *   2. Optionally enforces the per-tenant rate-limit middleware from
 *      `@starter-saas/tenancy` (`createRateLimitMiddleware`) — adopter
 *      passes the storage + max-per-window or accepts the kit defaults
 *
 * Adopter usage:
 *
 *     const app = await createGateway();
 *     await app.register(tenantContextPlugin, { rateLimit: { maxPerWindow: 100 } });
 *
 * After registration:
 *   - `request.tenantId` is set on every request (string | null)
 *   - When a tenant is in scope + rate-limit options were passed, the
 *     per-tenant token bucket is enforced before route handlers run
 */

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import {
  createRateLimitMiddleware,
  defaultTenantIdExtractor,
  type RateLimitOptions,
  type RateLimitRequest,
} from "@starter-saas/tenancy";

export interface TenantContextOptions {
  /** Function that pulls the active tenant ID from the request. Default
   *  reads the `x-tenant-id` header. Adopters typically replace with a
   *  session-cookie / JWT-claim / subdomain extractor. */
  extractTenantId?: (request: FastifyRequest) => string | null;
  /** When provided, the kit's per-tenant rate-limit middleware is registered
   *  as a `preHandler` hook. Pass `{}` for defaults (100 q/s per tenant). */
  rateLimit?: Omit<RateLimitOptions, "extractTenantId">;
}

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `tenantContextPlugin`. `null` when no tenant scope is present
     *  (e.g. unauthenticated platform-admin endpoints). */
    tenantId: string | null;
  }
}

const plugin: FastifyPluginAsync<TenantContextOptions> = async (app, options) => {
  const extract = options.extractTenantId ?? defaultExtractor;

  app.decorateRequest("tenantId", null);

  app.addHook("preHandler", async (request) => {
    request.tenantId = extract(request);
  });

  if (options.rateLimit) {
    const middleware = createRateLimitMiddleware({
      ...options.rateLimit,
      // Convert the Fastify-typed extractor back to the structural one the
      // tenancy middleware expects.
      extractTenantId: (req) =>
        extract(req as unknown as FastifyRequest),
    });
    app.addHook("preHandler", async (request, reply) => {
      await middleware(request as RateLimitRequest, reply);
    });
  }
};

function defaultExtractor(request: FastifyRequest): string | null {
  // Reuse the tenancy package's header reader so the extractor logic stays
  // in one place (case-insensitive, array-aware, empty-string-safe).
  return defaultTenantIdExtractor(request as unknown as RateLimitRequest);
}

/** Wrapped via `fastify/plugin` so the `request.tenantId` decoration is
 *  visible to parent encapsulation contexts. */
export const tenantContextPlugin = fp(plugin, {
  name: "starter-saas-tenant-context",
  fastify: "5.x",
});

/** Type-only export for adopters who want to register the plugin in their own
 *  `app.register()` call site with full option typing. */
export type TenantContextPluginOptions = TenantContextOptions;

// Helper for tests that need to inspect whether the plugin has been registered.
export function hasTenantContext(app: FastifyInstance): boolean {
  return app.hasRequestDecorator("tenantId");
}
