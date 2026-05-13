/**
 * Test-only Postgres harness backed by PGlite (an in-process WASM Postgres).
 *
 * Why pglite (not testcontainers): adopter contributor machines may not have
 * Docker; pglite boots in ~50ms versus testcontainers' ~5s; it speaks real
 * Postgres SQL including `CREATE SCHEMA` + JSON + UUID + transactions, which
 * is everything the kit's tenancy + saga primitives need. The 2026-05-11 sub-PR
 * #1 of STORY-015 locks pglite for the kit's integration tests.
 *
 * Usage:
 *
 *     import { createTestDb } from "@starter-saas/tenancy/testing";
 *
 *     const { db, close } = await createTestDb();
 *     // db is a Drizzle handle with the platform schema applied.
 *     await db.insert(tenants).values({ ... });
 *     await close();
 *
 * The PGlite peer dependency is optional (declared in package.json so kit
 * adopters who don't run integration tests don't pull the WASM blob).
 */

import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";

import * as schema from "../db/schema.js";

export interface TestDb {
  /** Drizzle handle bound to the in-memory pglite instance. */
  db: PgliteDatabase<typeof schema>;
  /** Raw pglite client (escape hatch for adopter-specific SQL). */
  client: PGlite;
  /** Tear down the in-memory DB. Safe to call multiple times. */
  close(): Promise<void>;
}

/** Boot an in-memory PGlite + apply the platform-schema DDL. */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await applyPlatformSchema(db);
  return {
    db,
    client,
    async close() {
      await client.close();
    },
  };
}

/** Apply the `platform` schema DDL — kept inline (not generated from
 *  drizzle-kit) so the test harness has zero migration tooling dependency.
 *  Mirrors `../db/schema.ts` exactly; both files evolve together. */
export async function applyPlatformSchema(
  db: PgliteDatabase<typeof schema>,
): Promise<void> {
  await db.execute(`CREATE SCHEMA IF NOT EXISTS platform`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.tenants (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name          text NOT NULL,
      slug          text NOT NULL UNIQUE,
      plan          text NOT NULL DEFAULT 'free',
      status        text NOT NULL DEFAULT 'provisioning',
      owner_id      uuid,
      archived_at   timestamptz,
      legal_hold    boolean NOT NULL DEFAULT false,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.tenant_migrations (
      tenant_id       uuid NOT NULL,
      migration_id    text NOT NULL,
      applied_at      timestamptz NOT NULL DEFAULT now(),
      failed_at       timestamptz,
      failure_reason  text,
      PRIMARY KEY (tenant_id, migration_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.tenant_archive_log (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id           uuid NOT NULL,
      archived_at         timestamptz NOT NULL,
      deleted_at          timestamptz,
      reason              text,
      requesting_user_id  uuid,
      created_at          timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.saga_instances (
      instance_id        uuid PRIMARY KEY,
      saga_name          text NOT NULL,
      status             text NOT NULL,
      current_step       integer NOT NULL DEFAULT 0,
      state              jsonb NOT NULL,
      completed_steps    jsonb NOT NULL DEFAULT '[]'::jsonb,
      compensated_steps  jsonb NOT NULL DEFAULT '[]'::jsonb,
      failure_reason     text,
      started_at         timestamptz NOT NULL,
      updated_at         timestamptz NOT NULL,
      completed_at       timestamptz
    )
  `);
}
