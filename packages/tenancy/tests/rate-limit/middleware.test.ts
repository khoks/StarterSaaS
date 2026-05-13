/**
 * Rate-limit middleware unit tests.
 *
 * Strategy: build a minimal fake `RateLimitRequest` + `RateLimitReply` pair
 * matching Fastify's structural shape. Inject a mockable `now` so the time
 * window can be advanced deterministically.
 */

import { describe, expect, it } from "vitest";

import {
  InMemoryRateLimitStorage,
  createRateLimitMiddleware,
  defaultTenantIdExtractor,
  type RateLimitReply,
  type RateLimitRequest,
} from "../../src/index.js";

interface CapturedReply {
  headers: Record<string, string | number>;
  status: number | null;
  payload: unknown;
  reply: RateLimitReply;
}

function makeReply(): CapturedReply {
  const headers: Record<string, string | number> = {};
  let status: number | null = null;
  let payload: unknown = undefined;
  const reply: RateLimitReply = {
    header(name, value) {
      headers[name] = value;
      return reply;
    },
    code(s) {
      status = s;
      return reply;
    },
    send(p) {
      payload = p;
      return reply;
    },
  };
  return {
    get headers() {
      return headers;
    },
    get status() {
      return status;
    },
    get payload() {
      return payload;
    },
    reply,
  };
}

function makeRequest(headers: Record<string, string> = {}): RateLimitRequest {
  return { headers };
}

describe("defaultTenantIdExtractor", () => {
  it("reads the `x-tenant-id` header (lowercase key)", () => {
    const id = defaultTenantIdExtractor(makeRequest({ "x-tenant-id": "t1" }));
    expect(id).toBe("t1");
  });

  it("returns null when the header is missing or empty", () => {
    expect(defaultTenantIdExtractor(makeRequest({}))).toBeNull();
    expect(defaultTenantIdExtractor(makeRequest({ "x-tenant-id": "" }))).toBeNull();
  });

  it("returns the first value when the header is an array", () => {
    const req: RateLimitRequest = {
      headers: { "x-tenant-id": ["t1", "t2"] },
    };
    expect(defaultTenantIdExtractor(req)).toBe("t1");
  });
});

describe("createRateLimitMiddleware — under the limit", () => {
  it("allows requests up to maxPerWindow and sets headers", async () => {
    let now = 1_000_000;
    const middleware = createRateLimitMiddleware({
      maxPerWindow: 3,
      windowMs: 1000,
      now: () => now,
    });

    const cap = makeReply();
    const req = makeRequest({ "x-tenant-id": "tenant-1" });

    for (let i = 0; i < 3; i++) {
      await middleware(req, cap.reply);
    }
    expect(cap.status).toBeNull();
    expect(cap.headers["x-ratelimit-limit"]).toBe(3);
    // After 3 requests with limit 3, remaining is 0.
    expect(cap.headers["x-ratelimit-remaining"]).toBe(0);
  });

  it("skips rate-limiting when extractor returns null", async () => {
    const middleware = createRateLimitMiddleware({
      maxPerWindow: 1,
      extractTenantId: () => null,
    });
    const cap = makeReply();
    await middleware(makeRequest(), cap.reply);
    await middleware(makeRequest(), cap.reply);
    await middleware(makeRequest(), cap.reply);
    expect(cap.status).toBeNull();
    // No headers set since we skipped entirely.
    expect(cap.headers["x-ratelimit-limit"]).toBeUndefined();
  });
});

describe("createRateLimitMiddleware — over the limit", () => {
  it("returns 429 with retry-after + standard headers on the (max+1)th request", async () => {
    let now = 1_000_000;
    const middleware = createRateLimitMiddleware({
      maxPerWindow: 2,
      windowMs: 1000,
      now: () => now,
    });

    const cap = makeReply();
    const req = makeRequest({ "x-tenant-id": "noisy-tenant" });

    await middleware(req, cap.reply);
    await middleware(req, cap.reply);
    // 3rd request — exceeds limit of 2.
    await middleware(req, cap.reply);

    expect(cap.status).toBe(429);
    const payload = cap.payload as { error: string; tenantId: string };
    expect(payload.error).toBe("rate_limit_exceeded");
    expect(payload.tenantId).toBe("noisy-tenant");
    expect(cap.headers["retry-after"]).toBeDefined();
    expect(cap.headers["x-ratelimit-remaining"]).toBe(0);
  });

  it("resets the count when the window expires", async () => {
    let now = 1_000_000;
    const middleware = createRateLimitMiddleware({
      maxPerWindow: 1,
      windowMs: 1000,
      now: () => now,
    });

    const req = makeRequest({ "x-tenant-id": "tenant-x" });

    const r1 = makeReply();
    await middleware(req, r1.reply);
    expect(r1.status).toBeNull();

    const r2 = makeReply();
    await middleware(req, r2.reply);
    expect(r2.status).toBe(429); // 2nd request in same window → blocked

    // Advance past the window.
    now += 2000;
    const r3 = makeReply();
    await middleware(req, r3.reply);
    expect(r3.status).toBeNull(); // Fresh window → allowed
  });

  it("isolates buckets per tenant (one noisy tenant doesn't affect another)", async () => {
    let now = 1_000_000;
    const middleware = createRateLimitMiddleware({
      maxPerWindow: 1,
      windowMs: 1000,
      now: () => now,
    });

    const noisy = makeRequest({ "x-tenant-id": "noisy" });
    const quiet = makeRequest({ "x-tenant-id": "quiet" });

    // Exhaust noisy's bucket.
    await middleware(noisy, makeReply().reply);
    const noisyOver = makeReply();
    await middleware(noisy, noisyOver.reply);
    expect(noisyOver.status).toBe(429);

    // Quiet still has its full budget.
    const quietOk = makeReply();
    await middleware(quiet, quietOk.reply);
    expect(quietOk.status).toBeNull();
  });
});

describe("createRateLimitMiddleware — defaults", () => {
  it("defaults to 100 requests / 1000ms per ADR-0004 §2", async () => {
    let now = 1_000_000;
    const middleware = createRateLimitMiddleware({ now: () => now });

    const req = makeRequest({ "x-tenant-id": "tenant-d" });

    // 100 requests should succeed.
    for (let i = 0; i < 100; i++) {
      const r = makeReply();
      await middleware(req, r.reply);
      expect(r.status).toBeNull();
    }
    // The 101st should be blocked.
    const over = makeReply();
    await middleware(req, over.reply);
    expect(over.status).toBe(429);
  });
});

describe("InMemoryRateLimitStorage", () => {
  it("recordAndCount returns 1 on first call, increments thereafter", async () => {
    const store = new InMemoryRateLimitStorage();
    const r1 = await store.recordAndCount({
      tenantId: "t",
      windowMs: 1000,
      now: 1_000_000,
    });
    expect(r1.count).toBe(1);
    const r2 = await store.recordAndCount({
      tenantId: "t",
      windowMs: 1000,
      now: 1_000_500,
    });
    expect(r2.count).toBe(2);
    expect(r2.windowEndsAt).toBe(r1.windowEndsAt); // same window
  });

  it("resets count when the window ends", async () => {
    const store = new InMemoryRateLimitStorage();
    await store.recordAndCount({ tenantId: "t", windowMs: 1000, now: 1_000_000 });
    const fresh = await store.recordAndCount({
      tenantId: "t",
      windowMs: 1000,
      now: 1_002_000, // past windowEndsAt of 1_001_000
    });
    expect(fresh.count).toBe(1);
    expect(fresh.windowEndsAt).toBe(1_003_000);
  });
});
