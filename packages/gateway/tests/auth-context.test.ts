/**
 * Tests for `authContextPlugin` — exercises token extraction (cookie + bearer),
 * session resolution, request decoration, required-mode 401s, and the
 * reconciliation with the tenant-context plugin's `request.tenantId` decoration.
 */

import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { Session } from "@starter-saas/auth";

import {
  authContextPlugin,
  createGateway,
  defaultTokenExtractor,
  tenantContextPlugin,
  type SessionResolver,
} from "../src/index.js";

const SAMPLE_SESSION: Session = {
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "alice@example.com",
    name: "Alice",
    image: null,
    emailVerified: new Date("2026-01-01"),
    totpEnabled: false,
  },
  activeTenant: {
    tenantId: "01900000-0000-7000-8000-000000000aaa",
    roleLabel: "admin",
    joinedAt: new Date("2026-02-01"),
  },
  expires: new Date("2027-01-01"),
};

function makeResolver(sessions: Record<string, Session | null> = {}): SessionResolver {
  return async (token) => sessions[token] ?? null;
}

describe("defaultTokenExtractor()", () => {
  it("reads the session cookie when present", () => {
    const token = defaultTokenExtractor(
      { headers: { cookie: "starter-saas-session=abc123" } } as never,
    );
    expect(token).toBe("abc123");
  });

  it("falls back to Authorization: Bearer when no cookie", () => {
    const token = defaultTokenExtractor(
      { headers: { authorization: "Bearer xyz789" } } as never,
    );
    expect(token).toBe("xyz789");
  });

  it("prefers cookie over Authorization header", () => {
    const token = defaultTokenExtractor(
      {
        headers: {
          cookie: "starter-saas-session=cookie-wins",
          authorization: "Bearer header-loses",
        },
      } as never,
    );
    expect(token).toBe("cookie-wins");
  });

  it("returns null when neither is present", () => {
    expect(defaultTokenExtractor({ headers: {} } as never)).toBeNull();
  });

  it("URL-decodes cookie values", () => {
    const token = defaultTokenExtractor(
      { headers: { cookie: "starter-saas-session=a%20b%2Bc" } } as never,
    );
    expect(token).toBe("a b+c");
  });

  it("strips surrounding quotes from cookie values", () => {
    const token = defaultTokenExtractor(
      { headers: { cookie: 'starter-saas-session="quoted-value"' } } as never,
    );
    expect(token).toBe("quoted-value");
  });
});

describe("authContextPlugin — non-required (default)", () => {
  it("decorates request.session + request.user when token resolves", async () => {
    const app = await createGateway();
    await app.register(authContextPlugin, {
      resolveSession: makeResolver({ "good-token": SAMPLE_SESSION }),
    });
    app.route({
      method: "GET",
      url: "/me",
      schema: {
        response: {
          200: z.object({
            userId: z.string().nullable(),
            email: z.string().nullable(),
          }),
        },
      },
      handler: async (request) => ({
        userId: request.user?.id ?? null,
        email: request.user?.email ?? null,
      }),
    });

    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: "Bearer good-token" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      userId: SAMPLE_SESSION.user.id,
      email: SAMPLE_SESSION.user.email,
    });
    await app.close();
  });

  it("sets request.session/user to null when token is missing", async () => {
    const app = await createGateway();
    await app.register(authContextPlugin, {
      resolveSession: makeResolver(),
    });
    app.route({
      method: "GET",
      url: "/me",
      schema: { response: { 200: z.object({ user: z.unknown().nullable() }) } },
      handler: async (request) => ({ user: request.user }),
    });
    const res = await app.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: null });
    await app.close();
  });

  it("sets request.session/user to null when token doesn't resolve", async () => {
    const app = await createGateway();
    await app.register(authContextPlugin, {
      resolveSession: makeResolver({}),
    });
    app.route({
      method: "GET",
      url: "/me",
      schema: { response: { 200: z.object({ user: z.unknown().nullable() }) } },
      handler: async (request) => ({ user: request.user }),
    });
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: "Bearer bad-token" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: null });
    await app.close();
  });

  it("swallows resolver errors + treats as unauthenticated", async () => {
    const app = await createGateway({ fastify: { logger: false } });
    const throwingResolver: SessionResolver = vi
      .fn()
      .mockRejectedValue(new Error("upstream-session-store-down"));
    await app.register(authContextPlugin, { resolveSession: throwingResolver });
    app.route({
      method: "GET",
      url: "/me",
      schema: { response: { 200: z.object({ user: z.unknown().nullable() }) } },
      handler: async (request) => ({ user: request.user }),
    });
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: "Bearer something" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: null });
    expect(throwingResolver).toHaveBeenCalledOnce();
    await app.close();
  });
});

describe("authContextPlugin — required: true", () => {
  it("401s when no token is present", async () => {
    const app = await createGateway();
    await app.register(authContextPlugin, {
      resolveSession: makeResolver(),
      required: true,
    });
    app.route({
      method: "GET",
      url: "/private",
      handler: async () => ({ ok: true }),
    });
    const res = await app.inject({ method: "GET", url: "/private" });
    expect(res.statusCode).toBe(401);
    expect((res.json() as { error: string }).error).toBe("unauthenticated");
    await app.close();
  });

  it("401s when token doesn't resolve", async () => {
    const app = await createGateway();
    await app.register(authContextPlugin, {
      resolveSession: makeResolver({}),
      required: true,
    });
    app.route({
      method: "GET",
      url: "/private",
      handler: async () => ({ ok: true }),
    });
    const res = await app.inject({
      method: "GET",
      url: "/private",
      headers: { authorization: "Bearer bad" },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("passes through when token resolves", async () => {
    const app = await createGateway();
    await app.register(authContextPlugin, {
      resolveSession: makeResolver({ "valid": SAMPLE_SESSION }),
      required: true,
    });
    app.route({
      method: "GET",
      url: "/private",
      handler: async (request) => ({ userId: request.user?.id }),
    });
    const res = await app.inject({
      method: "GET",
      url: "/private",
      headers: { authorization: "Bearer valid" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ userId: SAMPLE_SESSION.user.id });
    await app.close();
  });
});

describe("authContextPlugin — tenant-context reconciliation", () => {
  it("session's activeTenant overrides the header-extracted tenantId", async () => {
    const app = await createGateway();
    await app.register(tenantContextPlugin, {});
    await app.register(authContextPlugin, {
      resolveSession: makeResolver({ "tok": SAMPLE_SESSION }),
    });
    app.route({
      method: "GET",
      url: "/whoami",
      handler: async (request) => ({ tenantId: request.tenantId }),
    });
    const res = await app.inject({
      method: "GET",
      url: "/whoami",
      headers: {
        "x-tenant-id": "header-claim-different",
        authorization: "Bearer tok",
      },
    });
    expect(res.statusCode).toBe(200);
    // Session's activeTenant.tenantId wins over the header.
    expect(res.json()).toEqual({ tenantId: SAMPLE_SESSION.activeTenant?.tenantId });
    await app.close();
  });

  it("session with null activeTenant doesn't clobber the header-extracted tenantId", async () => {
    const noTenantSession: Session = { ...SAMPLE_SESSION, activeTenant: null };
    const app = await createGateway();
    await app.register(tenantContextPlugin, {});
    await app.register(authContextPlugin, {
      resolveSession: makeResolver({ "tok": noTenantSession }),
    });
    app.route({
      method: "GET",
      url: "/whoami",
      handler: async (request) => ({ tenantId: request.tenantId }),
    });
    const res = await app.inject({
      method: "GET",
      url: "/whoami",
      headers: {
        "x-tenant-id": "header-claim",
        authorization: "Bearer tok",
      },
    });
    expect(res.json()).toEqual({ tenantId: "header-claim" });
    await app.close();
  });
});
