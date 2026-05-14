/**
 * `@starter-saas/gateway` — Fastify-based HTTP gateway for StarterSaaS.
 *
 * Per [D-24](../../../CLAUDE.md) + [D-25](../../../CLAUDE.md):
 *   - Fastify v5 as the HTTP server
 *   - Zod schemas on every route boundary (input + output)
 *   - Plugin-friendly per Fastify's encapsulation model
 *
 * STORY-016 sub-PR scope:
 *  ✓ (#1) `createGateway()` factory + `/health` + Zod validation + tenant-context plugin — PR #38
 *  ✓ (#2) Auth-context plugin — session resolver + request.user/request.session — this PR
 *    (#3) `apps/starter` minimal entry running the gateway end-to-end
 */

export { createGateway, type CreateGatewayOptions, type GatewayInstance } from "./factory.js";
export {
  HealthResponseSchema,
  registerHealthRoute,
  type HealthResponse,
} from "./routes/health.js";
export {
  hasTenantContext,
  tenantContextPlugin,
  type TenantContextOptions,
  type TenantContextPluginOptions,
} from "./plugins/tenant-context.js";
export {
  authContextPlugin,
  defaultTokenExtractor,
  hasAuthContext,
  type AuthContextOptions,
  type AuthContextPluginOptions,
  type SessionResolver,
  type SessionTokenExtractor,
} from "./plugins/auth-context.js";

// Re-export the Zod type provider type so adopters can annotate their own
// `app.withTypeProvider<ZodTypeProvider>()` calls without re-importing.
export type { ZodTypeProvider } from "fastify-type-provider-zod";
