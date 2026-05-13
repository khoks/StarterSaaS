/**
 * Integration tests for `runTenantMigrations` against a real PGlite Postgres.
 *
 * Coverage:
 *   - Applies migrations to a single tenant's schema (search_path scoped)
 *   - Records per-tenant per-migration rows in `platform.tenant_migrations`
 *   - Idempotency: re-running skips already-applied migrations
 *   - Multi-tenant happy path (parallelism + isolation between tenants)
 *   - Continue-on-error: one bad tenant doesn't block the others
 *   - Fail-fast: aborts after first failing batch
 *   - Dry-run: no DB writes
 *   - `DrizzleTenantMigrator` (saga adapter) per-tenant path
 */

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  tenantMigrations as tenantMigrationsTable,
  tenants as tenantsTable,
} from "../../src/db/schema.js";
import {
  DrizzleTenantMigrator,
  runTenantMigrations,
  tenantSchemaName,
  type TenantMigration,
} from "../../src/index.js";
import { createTestDb, type TestDb } from "../../src/testing/index.js";

const TENANT_A = "01900000-0000-7000-8000-00000000000a";
const TENANT_B = "01900000-0000-7000-8000-00000000000b";
const TENANT_C = "01900000-0000-7000-8000-00000000000c";

async function seedTenants(harness: TestDb, ids: readonly string[]): Promise<void> {
  for (const id of ids) {
    await harness.db.insert(tenantsTable).values({
      id,
      name: `Tenant ${id.slice(-4)}`,
      slug: `tenant-${id.slice(-4)}`,
      ownerId: "00000000-0000-0000-0000-000000000001",
      status: "provisioning",
    });
    // CREATE SCHEMA for the tenant — saga step 2 would do this in production.
    await harness.client.exec(`CREATE SCHEMA ${tenantSchemaName(id)}`);
  }
}

const M1: TenantMigration = {
  id: "0001_create_users",
  sql: `CREATE TABLE users (id uuid PRIMARY KEY, email text NOT NULL)`,
};
const M2: TenantMigration = {
  id: "0002_create_roles",
  sql: `CREATE TABLE roles (id uuid PRIMARY KEY, name text NOT NULL UNIQUE)`,
};
const BAD: TenantMigration = {
  id: "0001_broken",
  sql: `THIS IS NOT VALID SQL`,
};

describe("runTenantMigrations — single tenant", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedTenants(harness, [TENANT_A]);
  });
  afterEach(async () => {
    await harness.close();
  });

  it("applies migrations to the tenant's schema + records to platform.tenant_migrations", async () => {
    const report = await runTenantMigrations(harness.db, [M1, M2], {
      tenantId: TENANT_A,
    });

    expect(report.allSucceeded).toBe(true);
    expect(report.outcomes).toHaveLength(1);
    expect(report.outcomes[0]?.applied).toEqual(["0001_create_users", "0002_create_roles"]);
    expect(report.outcomes[0]?.failures).toEqual([]);

    // Tables actually exist in the tenant's schema.
    const schema = tenantSchemaName(TENANT_A);
    const tables = await harness.client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
      [schema],
    );
    expect(tables.rows.map((r) => r.table_name)).toEqual(["roles", "users"]);

    // platform.tenant_migrations has the rows.
    const records = await harness.db
      .select()
      .from(tenantMigrationsTable);
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.failedAt === null)).toBe(true);
  });

  it("re-running skips already-applied migrations (idempotency)", async () => {
    await runTenantMigrations(harness.db, [M1], { tenantId: TENANT_A });
    const second = await runTenantMigrations(harness.db, [M1, M2], {
      tenantId: TENANT_A,
    });
    expect(second.outcomes[0]?.applied).toEqual(["0002_create_roles"]);
    expect(second.outcomes[0]?.alreadyApplied).toEqual(["0001_create_users"]);
  });

  it("dry-run: lists migrations without applying", async () => {
    const report = await runTenantMigrations(harness.db, [M1, M2], {
      tenantId: TENANT_A,
      dryRun: true,
    });
    expect(report.outcomes[0]?.applied).toEqual(["0001_create_users", "0002_create_roles"]);

    // platform.tenant_migrations was not written to.
    const records = await harness.db.select().from(tenantMigrationsTable);
    expect(records).toHaveLength(0);

    // Tables were not created.
    const tables = await harness.client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
      [tenantSchemaName(TENANT_A)],
    );
    expect(tables.rows).toHaveLength(0);
  });

  it("returns empty outcomes when tenantId is not in platform.tenants", async () => {
    const report = await runTenantMigrations(harness.db, [M1], {
      tenantId: "01900000-0000-7000-8000-deadbeefdead",
    });
    expect(report.outcomes).toEqual([]);
    expect(report.allSucceeded).toBe(true);
  });
});

describe("runTenantMigrations — multi-tenant", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedTenants(harness, [TENANT_A, TENANT_B, TENANT_C]);
  });
  afterEach(async () => {
    await harness.close();
  });

  it("iterates all non-archived tenants by default", async () => {
    const report = await runTenantMigrations(harness.db, [M1]);
    expect(report.allSucceeded).toBe(true);
    expect(report.outcomes).toHaveLength(3);
    const ids = report.outcomes.map((o) => o.tenantId).sort();
    expect(ids).toEqual([TENANT_A, TENANT_B, TENANT_C].sort());
  });

  it("continue-on-error (default): one bad tenant doesn't stop the others", async () => {
    // Pre-poison tenant B's schema by creating the `users` table already so M1
    // fails for B with "table already exists" — tenants A + C still succeed.
    await harness.client.exec(
      `CREATE TABLE ${tenantSchemaName(TENANT_B)}.users (id uuid PRIMARY KEY)`,
    );
    const report = await runTenantMigrations(harness.db, [M1]);

    expect(report.allSucceeded).toBe(false);
    expect(report.outcomes).toHaveLength(3);
    const byTenant = new Map(report.outcomes.map((o) => [o.tenantId, o]));
    expect(byTenant.get(TENANT_A)?.applied).toEqual(["0001_create_users"]);
    expect(byTenant.get(TENANT_B)?.failures).toHaveLength(1);
    expect(byTenant.get(TENANT_C)?.applied).toEqual(["0001_create_users"]);
  });

  it("fail-fast: aborts after the first failing batch", async () => {
    // Poison every tenant so the very first parallel batch produces failures.
    for (const id of [TENANT_A, TENANT_B, TENANT_C]) {
      await harness.client.exec(
        `CREATE TABLE ${tenantSchemaName(id)}.users (id uuid PRIMARY KEY)`,
      );
    }
    const report = await runTenantMigrations(harness.db, [M1], {
      parallelism: 1, // First tenant's batch contains only TENANT_A → aborts
      failureMode: "fail-fast",
    });
    expect(report.outcomes).toHaveLength(1);
    expect(report.abortedAfter).toBe(report.outcomes[0]?.tenantId);
  });

  it("skips soft-archived tenants (archived_at IS NOT NULL)", async () => {
    await harness.db
      .update(tenantsTable)
      .set({ archivedAt: new Date() })
      .where(eq(tenantsTable.id, TENANT_B));
    const report = await runTenantMigrations(harness.db, [M1]);
    const ids = report.outcomes.map((o) => o.tenantId).sort();
    expect(ids).toEqual([TENANT_A, TENANT_C].sort());
  });
});

describe("DrizzleTenantMigrator — saga step 3 adapter", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedTenants(harness, [TENANT_A]);
  });
  afterEach(async () => {
    await harness.close();
  });

  it("applies migrations for a single tenant + returns applied IDs", async () => {
    const migrator = new DrizzleTenantMigrator(harness.db, [M1, M2]);
    const result = await migrator.applyMigrations({
      tenantId: TENANT_A,
      schemaName: tenantSchemaName(TENANT_A),
    });
    expect(result.applied).toEqual(["0001_create_users", "0002_create_roles"]);
  });

  it("throws when a migration fails (saga compensation triggers from here)", async () => {
    const migrator = new DrizzleTenantMigrator(harness.db, [BAD]);
    await expect(
      migrator.applyMigrations({
        tenantId: TENANT_A,
        schemaName: tenantSchemaName(TENANT_A),
      }),
    ).rejects.toThrow(/0001_broken|syntax/i);
  });

  it("throws when the tenant doesn't exist", async () => {
    const migrator = new DrizzleTenantMigrator(harness.db, [M1]);
    await expect(
      migrator.applyMigrations({
        tenantId: "01900000-0000-7000-8000-deadbeefdead",
        schemaName: "tenant_dead",
      }),
    ).rejects.toThrow(/not found/i);
  });
});

