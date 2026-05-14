/**
 * `buildApp` — composes the kit gateway + auth + tenancy subsystems into
 * a ready-to-run Fastify instance.
 *
 * Adopter usage:
 *
 *     import { buildApp } from "@starter-saas/starter/boot";
 *     const app = await buildApp({ db, authConfig, emailSender });
 *     await app.listen({ port: 3000 });
 *
 * What's wired up:
 *   - Kit-defaults gateway (Zod boundary discipline + structured 400s + /health)
 *   - tenantContextPlugin with the kit's default per-tenant rate limit
 *   - authContextPlugin using the Drizzle-backed SessionResolver
 *   - POST /auth/sign-up, /auth/sign-in, /auth/sign-out
 *   - GET /me (authenticated)
 *
 * What's NOT wired up here (intentional):
 *   - Tenant provisioning saga HTTP endpoint — adopter wires it with their
 *     own concrete adapters (SecretsProvider, BillingRegistry, etc.); the
 *     saga itself is proven end-to-end in STORY-015 sub-PR #2's integration
 *     tests
 *   - OAuth providers — deferred (waits on @auth/core wiring + provider envs)
 *   - Magic link / TOTP enrollment HTTP routes — the flows exist in
 *     `@starter-saas/auth`; route wiring lands incrementally
 */

import type { FastifyInstance, FastifyServerOptions } from "fastify";

import type { AuthDb, AuthDeps } from "@starter-saas/auth";
import {
  authContextPlugin,
  createGateway,
  tenantContextPlugin,
} from "@starter-saas/gateway";

import { createDrizzleSessionResolver } from "./adapters/drizzle-session-resolver.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerMeRoute } from "./routes/me.js";

export interface BuildAppOptions {
  /** Shared DB handle used by both auth flows and the session resolver. */
  db: AuthDb;
  /** Auth deps — same shape the `@starter-saas/auth` flows expect. */
  authDeps: AuthDeps;
  /** Per-tenant rate-limit budget. Default 100 q/s per ADR-0004 §2. */
  rateLimit?: { maxPerWindow?: number; windowMs?: number };
  /** Set `Secure` + `SameSite=None` on the session cookie. Default false
   *  (dev / local). Adopter sets true behind HTTPS in production. */
  secureCookie?: boolean;
  /** Forwarded to Fastify (logger, bodyLimit, etc.). */
  fastify?: FastifyServerOptions;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = await createGateway(
    options.fastify ? { fastify: options.fastify } : {},
  );

  await app.register(tenantContextPlugin, {
    rateLimit: options.rateLimit ?? {},
  });
  await app.register(authContextPlugin, {
    resolveSession: createDrizzleSessionResolver(options.db),
  });

  await registerAuthRoutes(app, {
    deps: options.authDeps,
    secureCookie: options.secureCookie ?? false,
  });
  await registerMeRoute(app);

  return app;
}
