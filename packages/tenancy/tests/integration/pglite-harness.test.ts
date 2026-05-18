/**
 * Sanity tests for the `@starter-saas/tenancy/testing` pglite harness.
 *
 * Proves the harness boots a fresh in-memory Postgres + applies the platform
 * schema + accepts real CRUD against `platform.tenants`. Subsequent sub-PRs
 * of STORY-015 expand from here:
 *   - sub-PR #2 wires the migration runner against pglite
 *   - sub-PR #4 exercises 2-stage archival + legal-hold flows
 *   - the DrizzleSagaStore round-trip + provisioning-saga end-to-end follow
 *     when `TenantDb` is generalised over both postgres-js and pglite
 *     (current `TenantDb = PostgresJsDatabase<...>` is too narrow; relaxing
 *     it is a tractable refactor we defer until the migration runner needs it)
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { tenants } from "../../src/db/schema.js";
import { createTestDb, type TestDb } from "../../src/testing/index.js";

describe("createTestDb() — pglite harness", () => {
  let harness: TestDb;

  beforeEach(async () => {
    harness = await createTestDb();
  });

  afterEach(async () => {
    await harness.close();
  });

  it("boots a fresh pglite + creates the platform schema", async () => {
    const rows = await harness.client.query<{ schema_name: string }>(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'platform'`,
    );
    expect(rows.rows).toHaveLength(1);
  });

  it("creates the seven platform tables (tenancy + saga + pg-outbox bus)", async () => {
    const result = await harness.client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'platform' ORDER BY table_name`,
    );
    const names = result.rows.map((r) => r.table_name);
    expect(names).toEqual([
      "event_dedupe",
      "event_dlq",
      "outbox",
      "saga_instances",
      "tenant_archive_log",
      "tenant_migrations",
      "tenants",
    ]);
  });

  it("accepts CRUD against platform.tenants through the Drizzle handle", async () => {
    const tenantId = "01900000-0000-7000-8000-000000000001";
    await harness.db.insert(tenants).values({
      id: tenantId,
      name: "Acme Corporation",
      slug: "acme-corp",
      plan: "free",
      status: "provisioning",
      ownerId: "00000000-0000-0000-0000-000000000001",
    });

    const rows = await harness.db.select().from(tenants);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.slug).toBe("acme-corp");
    expect(rows[0]?.status).toBe("provisioning");
  });

  it("enforces the slug uniqueness constraint", async () => {
    await harness.db.insert(tenants).values({
      id: "01900000-0000-7000-8000-000000000001",
      name: "A",
      slug: "dupe",
      ownerId: "00000000-0000-0000-0000-000000000001",
    });
    await expect(
      harness.db.insert(tenants).values({
        id: "01900000-0000-7000-8000-000000000002",
        name: "B",
        slug: "dupe",
        ownerId: "00000000-0000-0000-0000-000000000001",
      }),
    ).rejects.toThrow(/unique|duplicate/i);
  });

  it("supports CREATE SCHEMA tenant_<uuid> + cleans up across createTestDb() calls", async () => {
    const schemaName = "tenant_0190000000007000800000000000aaaa";
    await harness.client.exec(`CREATE SCHEMA ${schemaName}`);
    const before = await harness.client.query<{ schema_name: string }>(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName],
    );
    expect(before.rows).toHaveLength(1);

    await harness.close();
    harness = await createTestDb(); // Fresh DB — tenant schema should be gone

    const after = await harness.client.query<{ schema_name: string }>(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName],
    );
    expect(after.rows).toHaveLength(0);
  });
});
