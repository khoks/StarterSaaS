/**
 * Test-only exports — `@starter-saas/tenancy/testing`.
 *
 * Adopter usage (in their own integration tests):
 *
 *     import { createTestDb } from "@starter-saas/tenancy/testing";
 *
 * Kept in a sub-path export so the production bundle doesn't drag the pglite
 * WASM blob in unless tests reach for it.
 */

export { applyPlatformSchema, createTestDb, type TestDb } from "./pglite.js";
