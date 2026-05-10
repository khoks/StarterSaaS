/**
 * @starter-saas/auth — Auth subsystem for StarterSaaS.
 *
 * Locked design: ../../docs/architecture/ADR-0007-auth-provider.md
 *
 * STORY-013 sub-PR scope:
 *  (this PR) Drizzle schemas + Zod contracts
 *  (next)    Auth.js v5 wiring + email+pwd flow
 *  (next)    Magic link + OAuth flows
 *  (next)    TOTP 2FA + audit-log writer + RBAC middleware
 */

export const PACKAGE_NAME = "@starter-saas/auth" as const;

export * as schema from "./db/schema.js";
export * from "./contracts/index.js";
