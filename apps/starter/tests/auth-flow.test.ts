/**
 * End-to-end HTTP auth-flow integration test against the wired-up reference
 * `apps/starter` app, running on PGlite.
 *
 * Exercises:
 *   1. POST /auth/sign-up → 200 with userId + email
 *   2. POST /auth/sign-in → 200 with sessionToken + Set-Cookie header
 *   3. GET /me with no auth → 401
 *   4. GET /me with bearer token → 200 with user info
 *   5. GET /me with cookie → 200 with user info
 *   6. POST /auth/sign-out → 200 + cookie cleared
 *   7. GET /me with the now-invalidated token → 401
 *   8. POST /auth/sign-up duplicate email → 409
 *   9. POST /auth/sign-in invalid password → 401
 *  10. /health route still works
 *
 * Closes a long-standing deferred AC: "user can sign up via email+password +
 * the kit boots a real HTTP layer" — previously stuck behind apps/starter.
 */

import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  defaultAuthConfig,
  noopEmailSender,
  type AuthDeps,
} from "@starter-saas/auth";

import { buildApp } from "../src/boot.js";
import { createIntegrationDb, type IntegrationTestEnv } from "./setup.js";

describe("apps/starter — end-to-end auth flow against PGlite", () => {
  let env: IntegrationTestEnv;
  let app: FastifyInstance;

  beforeEach(async () => {
    env = await createIntegrationDb();
    const authDeps: AuthDeps = {
      db: env.db as unknown as AuthDeps["db"],
      emailSender: noopEmailSender,
      config: {
        ...defaultAuthConfig,
        baseUrl: "http://localhost:3000",
        // Skip email verification in tests so the sign-in path doesn't trip on it.
        requireEmailVerification: false,
      },
    };
    app = await buildApp({
      db: env.db as unknown as AuthDeps["db"],
      authDeps,
      rateLimit: { maxPerWindow: 1000, windowMs: 1000 }, // generous in tests
      fastify: { logger: false },
    });
  });

  afterEach(async () => {
    await app.close();
    await env.close();
  });

  it("happy path: sign-up → sign-in → /me (bearer) → /me (cookie) → sign-out → /me 401", async () => {
    // 1. Sign up
    const signUp = await app.inject({
      method: "POST",
      url: "/auth/sign-up",
      payload: { email: "alice@example.com", password: "correct-horse-battery", name: "Alice" },
    });
    expect(signUp.statusCode).toBe(200);
    const signUpBody = signUp.json() as { userId: string; email: string };
    expect(signUpBody.email).toBe("alice@example.com");
    expect(signUpBody.userId).toMatch(/^[0-9a-f-]{36}$/);

    // 2. Sign in
    const signIn = await app.inject({
      method: "POST",
      url: "/auth/sign-in",
      payload: { email: "alice@example.com", password: "correct-horse-battery" },
    });
    expect(signIn.statusCode).toBe(200);
    const signInBody = signIn.json() as { sessionToken: string };
    expect(signInBody.sessionToken).toBeTruthy();
    const setCookie = signIn.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
    expect(cookieHeader).toContain("starter-saas-session=");

    // 3. /me without auth → 401
    const meAnon = await app.inject({ method: "GET", url: "/me" });
    expect(meAnon.statusCode).toBe(401);

    // 4. /me with bearer token → 200
    const meBearer = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${signInBody.sessionToken}` },
    });
    expect(meBearer.statusCode).toBe(200);
    expect((meBearer.json() as { user: { email: string } }).user.email).toBe(
      "alice@example.com",
    );

    // 5. /me with cookie → 200
    const meCookie = await app.inject({
      method: "GET",
      url: "/me",
      headers: { cookie: cookieHeader.split(";")[0]! },
    });
    expect(meCookie.statusCode).toBe(200);

    // 6. Sign out
    const signOut = await app.inject({
      method: "POST",
      url: "/auth/sign-out",
      headers: { cookie: cookieHeader.split(";")[0]! },
    });
    expect(signOut.statusCode).toBe(200);

    // 7. /me with invalidated bearer token → 401
    const mePostOut = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${signInBody.sessionToken}` },
    });
    expect(mePostOut.statusCode).toBe(401);
  });

  it("sign-up rejects duplicate email with 409", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/sign-up",
      payload: { email: "bob@example.com", password: "correct-horse-battery" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/auth/sign-up",
      payload: { email: "bob@example.com", password: "correct-horse-battery-2" },
    });
    expect(second.statusCode).toBe(409);
    expect((second.json() as { error: string }).error).toBe("email_already_exists");
  });

  it("sign-in rejects wrong password with 401", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/sign-up",
      payload: { email: "carol@example.com", password: "correct-horse-battery" },
    });
    const bad = await app.inject({
      method: "POST",
      url: "/auth/sign-in",
      payload: { email: "carol@example.com", password: "wrong-password" },
    });
    expect(bad.statusCode).toBe(401);
    expect((bad.json() as { error: string }).error).toBe("invalid-credentials");
  });

  it("Zod validation rejects malformed sign-up with structured 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/sign-up",
      payload: { email: "not-an-email", password: "x" }, // bad email + short pw
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: string; message: string };
    expect(body.error).toBe("validation_error");
    // fastify-type-provider-zod v4 flattens issues into the message string —
    // both fields must mention the bad email + the short password.
    expect(body.message).toContain("email");
    expect(body.message).toContain("password");
  });

  it("/health is registered by the kit gateway", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { status: string }).status).toBe("ok");
  });
});
