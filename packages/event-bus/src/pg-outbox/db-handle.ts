/**
 * Cross-adapter Drizzle DB handle for the pg-outbox bus.
 *
 * Both postgres-js (production per D-32) and pglite (test harness per
 * STORY-015 sub-PR #1) compose `PgDatabase<PgQueryResultHKT, ...>`. We type
 * against the base HKT so the bus accepts either — same pattern as
 * `@starter-saas/tenancy`'s `TenantDb`. Adopter who swaps in another driver
 * (node-postgres / Neon HTTP / etc.) gets the same surface.
 */

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type * as schema from "./schema.js";

export type OutboxDb = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
