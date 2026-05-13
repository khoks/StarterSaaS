/**
 * Per-tenant rate-limit middleware — Fastify-shaped preHandler hook
 * per ADR-0004 §2.
 *
 * Default budget = **100 queries/sec/tenant** per ADR-0004's side-pick. Tunable.
 *
 * Structural typing for Fastify request/reply — the middleware works with any
 * Fastify version (or any framework with a compatible request/reply shape)
 * without requiring `fastify` as a hard dependency. Adopter uses it as:
 *
 *     fastify.addHook("preHandler", createRateLimitMiddleware());
 *
 * 429 responses include the standard rate-limit headers
 * (`x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`) +
 * `retry-after` (seconds) so clients can back off correctly.
 */

import {
  InMemoryRateLimitStorage,
  type RateLimitStorage,
} from "./storage.js";

/** Structural shape of Fastify's `FastifyRequest` we depend on. */
export interface RateLimitRequest {
  headers: Record<string, string | string[] | undefined>;
}

/** Structural shape of Fastify's `FastifyReply` we depend on. Both `header`
 *  and `code` return `this` so the adopter can chain — matching real Fastify. */
export interface RateLimitReply {
  header(name: string, value: string | number): RateLimitReply;
  code(statusCode: number): RateLimitReply;
  send(payload: unknown): RateLimitReply;
}

export interface RateLimitOptions {
  /** Max requests allowed per `windowMs` per tenant. Default 100 (per ADR-0004). */
  maxPerWindow?: number;
  /** Window size in milliseconds. Default 1000 (= 100 q/s with the default
   *  maxPerWindow). */
  windowMs?: number;
  /** Function to extract the tenant ID from the request. Default reads the
   *  `x-tenant-id` header. Returning `null` skips rate-limiting (e.g. for
   *  un-authenticated platform-admin endpoints). */
  extractTenantId?: (request: RateLimitRequest) => string | null;
  /** Storage backend. Default = `InMemoryRateLimitStorage` (single-process).
   *  Adopters swap in a Redis-backed impl for multi-process fleets. */
  storage?: RateLimitStorage;
  /** Clock — overrideable for tests. Default `Date.now`. */
  now?: () => number;
}

export type RateLimitHandler = (
  request: RateLimitRequest,
  reply: RateLimitReply,
) => Promise<RateLimitReply | void>;

const DEFAULT_MAX_PER_WINDOW = 100;
const DEFAULT_WINDOW_MS = 1_000;

/** Read the `x-tenant-id` header (case-insensitive; first value if array). */
export function defaultTenantIdExtractor(
  request: RateLimitRequest,
): string | null {
  const raw = request.headers["x-tenant-id"];
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function createRateLimitMiddleware(
  options: RateLimitOptions = {},
): RateLimitHandler {
  const maxPerWindow = options.maxPerWindow ?? DEFAULT_MAX_PER_WINDOW;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const extract = options.extractTenantId ?? defaultTenantIdExtractor;
  const storage = options.storage ?? new InMemoryRateLimitStorage();
  const now = options.now ?? Date.now;

  return async (request, reply) => {
    const tenantId = extract(request);
    if (tenantId === null) return; // Skip rate-limiting when no tenant scope.

    const { count, windowEndsAt } = await storage.recordAndCount({
      tenantId,
      windowMs,
      now: now(),
    });

    const remaining = Math.max(0, maxPerWindow - count);
    const resetSec = Math.max(0, Math.ceil((windowEndsAt - now()) / 1000));

    reply
      .header("x-ratelimit-limit", maxPerWindow)
      .header("x-ratelimit-remaining", remaining)
      .header("x-ratelimit-reset", resetSec);

    if (count > maxPerWindow) {
      reply.header("retry-after", resetSec);
      return reply.code(429).send({
        error: "rate_limit_exceeded",
        message: `Per-tenant rate limit exceeded (${maxPerWindow} requests per ${windowMs}ms)`,
        tenantId,
      });
    }

    return;
  };
}
