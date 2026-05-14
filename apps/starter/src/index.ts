/**
 * @starter-saas/starter — reference application running the kit gateway
 * + auth + tenancy subsystems end-to-end.
 *
 * Adopters fork this as their starting point. Run with their own DB +
 * email sender + (later) front-end via the Next.js App Router shell when
 * EPIC-008's UX work lands.
 *
 * Public exports:
 *   - `buildApp(options)` — compose the wired-up Fastify instance
 *   - `createDrizzleSessionResolver(db)` — reference `SessionResolver`
 *     adapter for `platform.sessions` (adopter swaps for Redis/JWT/etc.)
 */

export { buildApp, type BuildAppOptions } from "./boot.js";
export { createDrizzleSessionResolver } from "./adapters/drizzle-session-resolver.js";

export const APP_NAME = "@starter-saas/starter" as const;
