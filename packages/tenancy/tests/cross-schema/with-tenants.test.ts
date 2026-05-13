/**
 * `withTenants()` unit tests.
 *
 * Strategy: use a mock `TenantDb` (typed-as-any) since the per-tenant fn
 * receives the ctx + decides what to do; we focus on the per-tenant iteration
 * semantics: parallelism, failure modes, schema-name derivation, helpers.
 */

import { describe, expect, it, vi } from "vitest";

import {
  partitionTenantResults,
  withTenants,
  type TenantDb,
  type TenantQueryFn,
} from "../../src/index.js";

const TENANT_A = "01900000-0000-7000-8000-00000000000a";
const TENANT_B = "01900000-0000-7000-8000-00000000000b";
const TENANT_C = "01900000-0000-7000-8000-00000000000c";

// We only inspect ctx, never call methods on db — use a plain object cast.
const FAKE_DB = {} as unknown as TenantDb;

describe("withTenants() — happy path", () => {
  it("runs the fn once per tenant and returns aggregated results", async () => {
    const seen: string[] = [];
    const fn: TenantQueryFn<number> = async (ctx) => {
      seen.push(ctx.tenantId);
      return ctx.tenantId.length;
    };

    const results = await withTenants(
      FAKE_DB,
      [TENANT_A, TENANT_B, TENANT_C],
      fn,
    );

    expect(seen).toHaveLength(3);
    expect(seen).toEqual(expect.arrayContaining([TENANT_A, TENANT_B, TENANT_C]));
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("derives the schema name from tenant ID", async () => {
    const fn: TenantQueryFn<{ schemaName: string }> = async (ctx) => ({
      schemaName: ctx.schemaName,
    });
    const results = await withTenants(FAKE_DB, [TENANT_A], fn);
    expect(results).toHaveLength(1);
    const r = results[0];
    if (!r?.ok) throw new Error("expected ok");
    expect(r.value.schemaName).toBe("tenant_0190000000007000800000000000000a");
  });

  it("ctx.qualified() builds a schema-qualified identifier fragment", async () => {
    const fn: TenantQueryFn<string> = async (ctx) => {
      const fragment = ctx.qualified("users");
      // SQL fragment exposes a `getSQL()` method in Drizzle; we just check it exists.
      return fragment != null ? "got-fragment" : "missing";
    };
    const results = await withTenants(FAKE_DB, [TENANT_A], fn);
    expect(results[0]?.ok).toBe(true);
    if (results[0]?.ok) expect(results[0].value).toBe("got-fragment");
  });
});

describe("withTenants() — failure modes", () => {
  it("continue-on-error (default): runs every tenant, captures errors", async () => {
    const fn: TenantQueryFn<string> = async (ctx) => {
      if (ctx.tenantId === TENANT_B) throw new Error("tenant-b-down");
      return "ok";
    };

    const results = await withTenants(FAKE_DB, [TENANT_A, TENANT_B, TENANT_C], fn);
    expect(results).toHaveLength(3);
    const byTenant = new Map(results.map((r) => [r.tenantId, r]));
    expect(byTenant.get(TENANT_A)?.ok).toBe(true);
    expect(byTenant.get(TENANT_B)?.ok).toBe(false);
    expect(byTenant.get(TENANT_C)?.ok).toBe(true);
  });

  it("fail-fast: aborts after the first failing batch", async () => {
    const fn = vi.fn(async (ctx: Parameters<TenantQueryFn<string>>[0]) => {
      if (ctx.tenantId === TENANT_A) throw new Error("first-fails");
      return "ok";
    });

    // With parallelism 1, the first tenant fails → no more batches run.
    const results = await withTenants(
      FAKE_DB,
      [TENANT_A, TENANT_B, TENANT_C],
      fn,
      { parallelism: 1, failureMode: "fail-fast" },
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.ok).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("non-Error throws are wrapped into Error", async () => {
    const fn: TenantQueryFn<string> = async () => {
      throw "string-thrown"; // eslint-disable-line @typescript-eslint/only-throw-error
    };
    const results = await withTenants(FAKE_DB, [TENANT_A], fn);
    expect(results[0]?.ok).toBe(false);
    if (results[0]?.ok) return;
    expect(results[0].error).toBeInstanceOf(Error);
    expect(results[0].error.message).toBe("string-thrown");
  });
});

describe("withTenants() — parallelism", () => {
  it("respects the parallelism cap", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fn: TenantQueryFn<void> = async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((res) => setTimeout(res, 5));
      inFlight--;
    };

    const tenants = Array.from(
      { length: 12 },
      (_, i) =>
        `01900000-0000-7000-8000-${i.toString(16).padStart(12, "0")}`,
    );
    await withTenants(FAKE_DB, tenants, fn, { parallelism: 3 });
    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(maxInFlight).toBe(3);
  });

  it("defaults parallelism to 5 (matches ADR-0004 migration-runner default)", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fn: TenantQueryFn<void> = async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((res) => setTimeout(res, 5));
      inFlight--;
    };
    const tenants = Array.from(
      { length: 12 },
      (_, i) =>
        `01900000-0000-7000-8000-${i.toString(16).padStart(12, "0")}`,
    );
    await withTenants(FAKE_DB, tenants, fn);
    expect(maxInFlight).toBe(5);
  });

  it("clamps parallelism to >= 1", async () => {
    const fn: TenantQueryFn<void> = async () => {
      /* no-op */
    };
    // parallelism: 0 should not throw / hang
    const results = await withTenants(FAKE_DB, [TENANT_A, TENANT_B], fn, {
      parallelism: 0,
    });
    expect(results).toHaveLength(2);
  });
});

describe("partitionTenantResults()", () => {
  it("splits into successes + failures", () => {
    const e = new Error("boom");
    const { successes, failures } = partitionTenantResults([
      { tenantId: "a", ok: true, value: 1 },
      { tenantId: "b", ok: false, error: e },
      { tenantId: "c", ok: true, value: 2 },
    ]);
    expect(successes).toEqual([
      { tenantId: "a", value: 1 },
      { tenantId: "c", value: 2 },
    ]);
    expect(failures).toEqual([{ tenantId: "b", error: e }]);
  });
});
