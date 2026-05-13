/**
 * Per-tenant rate-limit middleware — public exports.
 *
 * Per ADR-0004 §2: default 100 queries/sec/tenant, adopter-tunable; Fastify-
 * shaped preHandler hook structural-typed against `FastifyRequest`/`FastifyReply`
 * so the kit doesn't depend on Fastify directly.
 */

export {
  createRateLimitMiddleware,
  defaultTenantIdExtractor,
  type RateLimitHandler,
  type RateLimitOptions,
  type RateLimitReply,
  type RateLimitRequest,
} from "./middleware.js";
export {
  InMemoryRateLimitStorage,
  type RateLimitCheckResult,
  type RateLimitStorage,
} from "./storage.js";
