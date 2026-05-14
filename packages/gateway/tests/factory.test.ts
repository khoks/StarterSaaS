/**
 * Tests for `createGateway` — boots a Fastify instance, hits routes via
 * `inject()` (no real network listener), asserts on the Zod boundary
 * discipline + error formatting.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createGateway } from "../src/index.js";

describe("createGateway()", () => {
  it("returns a Fastify instance with the Zod type provider wired up", async () => {
    const app = await createGateway();
    expect(app).toBeDefined();
    expect(typeof app.inject).toBe("function");
    await app.close();
  });

  it("registers the kit-default `/health` route by default", async () => {
    const app = await createGateway();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string; uptime: number };
    expect(body.status).toBe("ok");
    expect(body.uptime).toBeGreaterThan(0);
    await app.close();
  });

  it("respects `registerHealthRoute: false` (opt-out)", async () => {
    const app = await createGateway({ registerHealthRoute: false });
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("validates request bodies via Zod + returns structured 400 on failure", async () => {
    const app = await createGateway();
    app.route({
      method: "POST",
      url: "/widgets",
      schema: { body: z.object({ name: z.string().min(2) }) },
      handler: async () => ({ ok: true }),
    });

    const bad = await app.inject({
      method: "POST",
      url: "/widgets",
      payload: { name: "x" }, // fails min(2)
    });
    expect(bad.statusCode).toBe(400);
    const body = bad.json() as { error: string; issues: unknown };
    expect(body.error).toBe("validation_error");
    expect(Array.isArray(body.issues)).toBe(true);

    await app.close();
  });

  it("passes through valid requests + the handler sees typed body", async () => {
    const app = await createGateway();
    app.route({
      method: "POST",
      url: "/widgets",
      schema: { body: z.object({ name: z.string().min(2) }) },
      handler: async (request) => {
        // request.body.name is `string` thanks to the type provider.
        return { received: request.body.name };
      },
    });
    const res = await app.inject({
      method: "POST",
      url: "/widgets",
      payload: { name: "valid-name" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: "valid-name" });
    await app.close();
  });

  it("validates response shapes via the serializer compiler (catches handler bugs)", async () => {
    const app = await createGateway();
    app.route({
      method: "GET",
      url: "/strict",
      schema: {
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
      // Handler returns the wrong shape — the serializer should error.
      handler: async () => ({ ok: false } as unknown as { ok: true }),
    });
    const res = await app.inject({ method: "GET", url: "/strict" });
    expect(res.statusCode).toBe(500); // serializer-side schema failure → 500
    await app.close();
  });
});
