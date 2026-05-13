/**
 * @starter-saas/tenancy — schema-per-tenant infrastructure for StarterSaaS.
 *
 * Locked design: ../../docs/architecture/ADR-0004-multi-tenancy.md
 *
 * STORY-014 sub-PR scope:
 *  ✓ (#1) `@starter-saas/event-bus` + `@starter-saas/saga` primitives           — PR #30
 *  ✓ (#2) tenancy schemas (`platform.tenants` etc.) + `DrizzleSagaStore`        — PR #31
 *  ✓ (#3) 9-step tenant provisioning saga                                       — PR #32
 *  ✓ (#4) `withTenants()` cross-schema wrapper + per-tenant rate-limit middleware — this PR
 */

export const PACKAGE_NAME = "@starter-saas/tenancy" as const;

// Drizzle schemas — public for both adopter app code + migration tooling
export * as schema from "./db/schema.js";

// Zod boundary contracts
export * from "./contracts.js";

// Production SagaStore backed by Drizzle
export { DrizzleSagaStore } from "./saga-store.js";
export type { SagaStoreDb } from "./saga-store.js";

// 9-step tenant provisioning saga (per ADR-0004 §3)
export * from "./provisioning/index.js";

// Cross-schema query primitives (per ADR-0004 §2)
export * from "./cross-schema/index.js";

// Per-tenant rate-limit middleware (per ADR-0004 §2)
export * from "./rate-limit/index.js";
