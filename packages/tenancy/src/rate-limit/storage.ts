/**
 * Per-tenant rate-limit storage abstraction.
 *
 * The default `InMemoryRateLimitStorage` ships with the kit + handles single-
 * process Fastify deployments. Adopters running multi-process / multi-region
 * fleets swap in a Redis-backed impl (`@starter-saas/rate-limit-redis`,
 * v1+ adapter).
 *
 * Semantics: token bucket per (tenant, window). `recordAndCount` increments
 * the bucket + returns the current count + the window-end timestamp; the
 * middleware decides allow/deny based on `count <= maxPerWindow`.
 */

export interface RateLimitCheckResult {
  /** Current request count in the active window for this tenant. */
  count: number;
  /** When the active window ends (epoch ms). After this, count resets to 0. */
  windowEndsAt: number;
}

export interface RateLimitStorage {
  /** Record one request for the tenant + return the post-increment count
   *  and window-end timestamp. */
  recordAndCount(args: {
    tenantId: string;
    /** Window size in milliseconds. */
    windowMs: number;
    /** Current time (epoch ms) — passed in so tests can mock the clock. */
    now: number;
  }): Promise<RateLimitCheckResult>;
}

interface Bucket {
  count: number;
  windowEndsAt: number;
}

/** Default in-memory token-bucket storage. Single-process only. */
export class InMemoryRateLimitStorage implements RateLimitStorage {
  private readonly buckets = new Map<string, Bucket>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async recordAndCount(args: {
    tenantId: string;
    windowMs: number;
    now: number;
  }): Promise<RateLimitCheckResult> {
    const existing = this.buckets.get(args.tenantId);
    if (!existing || existing.windowEndsAt <= args.now) {
      // Fresh window.
      const bucket: Bucket = { count: 1, windowEndsAt: args.now + args.windowMs };
      this.buckets.set(args.tenantId, bucket);
      return { count: bucket.count, windowEndsAt: bucket.windowEndsAt };
    }
    existing.count += 1;
    return { count: existing.count, windowEndsAt: existing.windowEndsAt };
  }

  /** Test helper — reset all per-tenant buckets. Not part of the public
   *  RateLimitStorage interface. */
  reset(): void {
    this.buckets.clear();
  }
}
