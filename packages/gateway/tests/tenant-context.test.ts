/**
 * Tests for the tenant-context plugin — exercises the `request.tenantId`
 * decoration + the integrated rate-limit pre-handler.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createGateway, tenantContextPlugin } from "../src/index.js";

describe("tenantContextPlugin", () => {
  it("decorates request.tenantId from the default `x-tenant-id` header", async () => {
    const app = await createGateway();
    await app.register(tenantContextPlugin, {});
    app.route({
      method: "GET",
      url: "/whoami",
      schema: { response: { 200: z.object({ tenantId: z.string().nullable() }) } },
      handler: async (request) => ({ tenantId: request.tenantId }),
    });

    const res = await app.inject({
      method: "GET",
      url: "/whoami",
      headers: { "x-tenant-id": "t-123" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tenantId: "t-123" });
    await app.close();
  });

  it("sets request.tenantId to null when no header is present", async () => {
    const app = await createGateway();
    await app.register(tenantContextPlugin, {});
    app.route({
      method: "GET",
      url: "/whoami",
      schema: { response: { 200: z.object({ tenantId: z.string().nullable() }) } },
      handler: async (request) => ({ tenantId: request.tenantId }),
    });

    const res = await app.inject({ method: "GET", url: "/whoami" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tenantId: null });
    await app.close();
  });

  it("honors a custom `extractTenantId` override", async () => {
    const app = await createGateway();
    await app.register(tenantContextPlugin, {
      extractTenantId: (req) => {
        const sub = (req.headers["x-subdomain"] as string | undefined) ?? null;
        return sub === "acme" ? "tenant-acme" : null;
      },
    });
    app.route({
      method: "GET",
      url: "/whoami",
      schema: { response: { 200: z.object({ tenantId: z.string().nullable() }) } },
      handler: async (request) => ({ tenantId: request.tenantId }),
    });

    const res = await app.inject({
      method: "GET",
      url: "/whoami",
      headers: { "x-subdomain": "acme" },
    });
    expect(res.json()).toEqual({ tenantId: "tenant-acme" });
    await app.close();
  });

  it("enforces per-tenant rate-limit when configured", async () => {
    const app = await createGateway();
    await app.register(tenantContextPlugin, {
      rateLimit: { maxPerWindow: 2, windowMs: 1000 },
    });
    app.route({
      method: "GET",
      url: "/ping",
      schema: { response: { 200: z.object({ ok: z.literal(true) }) } },
      handler: async () => ({ ok: true as const }),
    });

    const headers = { "x-tenant-id": "noisy" };
    const r1 = await app.inject({ method: "GET", url: "/ping", headers });
    const r2 = await app.inject({ method: "GET", url: "/ping", headers });
    const r3 = await app.inject({ method: "GET", url: "/ping", headers });

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r3.statusCode).toBe(429);
    const body = r3.json() as { error: string; tenantId: string };
    expect(body.error).toBe("rate_limit_exceeded");
    expect(body.tenantId).toBe("noisy");

    await app.close();
  });

  it("rate-limit skips when no tenant is in scope (extractor returns null)", async () => {
    const app = await createGateway();
    await app.register(tenantContextPlugin, {
      rateLimit: { maxPerWindow: 1, windowMs: 1000 },
    });
    app.route({
      method: "GET",
      url: "/ping",
      schema: { response: { 200: z.object({ ok: z.literal(true) }) } },
      handler: async () => ({ ok: true as const }),
    });

    // No x-tenant-id header → middleware short-circuits, all requests pass.
    const r1 = await app.inject({ method: "GET", url: "/ping" });
    const r2 = await app.inject({ method: "GET", url: "/ping" });
    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);

    await app.close();
  });
});
