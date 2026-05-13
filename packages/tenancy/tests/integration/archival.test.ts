/**
 * Integration tests for the 2-stage archival flow + tenant doctor against
 * PGlite. Exercises the ADR-0004 §4 contract.
 */

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DrizzleSchemaManager,
  DrizzleTenantRegistry,
  archiveTenant,
  restoreTenant,
  runHardDeleteSweep,
  runTenantDoctor,
  tenantSchemaName,
} from "../../src/index.js";
import { tenantArchiveLog, tenants } from "../../src/db/schema.js";
import { createTestDb, type TestDb } from "../../src/testing/index.js";

const TENANT_A = "01900000-0000-7000-8000-00000000000a";
const TENANT_B = "01900000-0000-7000-8000-00000000000b";
const TENANT_C = "01900000-0000-7000-8000-00000000000c";

async function seedActiveTenant(harness: TestDb, id: string): Promise<void> {
  const reg = new DrizzleTenantRegistry(harness.db);
  await reg.reserveTenant({
    tenantId: id,
    name: `Tenant ${id.slice(-4)}`,
    slug: `tenant-${id.slice(-4)}`,
    plan: "free",
    ownerId: "00000000-0000-0000-0000-000000000001",
  });
  await reg.markStatus({ tenantId: id, status: "active" });
  await harness.client.exec(`CREATE SCHEMA ${tenantSchemaName(id)}`);
}

describe("archiveTenant — stage 1", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedActiveTenant(harness, TENANT_A);
  });
  afterEach(async () => {
    await harness.close();
  });

  it("flips archived_at + status, inserts an audit row", async () => {
    const result = await archiveTenant(harness.db, {
      tenantId: TENANT_A,
      reason: "Customer cancelled subscription",
      requestingUserId: "00000000-0000-0000-0000-000000000099",
    });
    expect(result.archivedFreshly).toBe(true);
    expect(result.archiveLogId).not.toBeNull();

    const [row] = await harness.db.select().from(tenants).where(eq(tenants.id, TENANT_A));
    expect(row?.status).toBe("archived");
    expect(row?.archivedAt).not.toBeNull();

    const audit = await harness.db
      .select()
      .from(tenantArchiveLog)
      .where(eq(tenantArchiveLog.tenantId, TENANT_A));
    expect(audit).toHaveLength(1);
    expect(audit[0]?.reason).toBe("Customer cancelled subscription");
    expect(audit[0]?.requestingUserId).toBe("00000000-0000-0000-0000-000000000099");
    expect(audit[0]?.deletedAt).toBeNull();
  });

  it("is idempotent — re-archiving returns archivedFreshly=false, no extra audit row", async () => {
    const first = await archiveTenant(harness.db, { tenantId: TENANT_A });
    expect(first.archivedFreshly).toBe(true);

    const second = await archiveTenant(harness.db, {
      tenantId: TENANT_A,
      reason: "second-call",
    });
    expect(second.archivedFreshly).toBe(false);
    expect(second.archivedAt.getTime()).toBe(first.archivedAt.getTime());

    const audit = await harness.db.select().from(tenantArchiveLog);
    expect(audit).toHaveLength(1); // No duplicate audit row
  });

  it("throws when the tenant doesn't exist", async () => {
    await expect(
      archiveTenant(harness.db, {
        tenantId: "01900000-0000-7000-8000-deadbeefdead",
      }),
    ).rejects.toThrow(/not found/);
  });
});

describe("restoreTenant", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedActiveTenant(harness, TENANT_A);
  });
  afterEach(async () => {
    await harness.close();
  });

  it("flips archived_at back to NULL + status to active", async () => {
    await archiveTenant(harness.db, { tenantId: TENANT_A });
    const result = await restoreTenant(harness.db, { tenantId: TENANT_A });
    expect(result.restored).toBe(true);

    const [row] = await harness.db.select().from(tenants).where(eq(tenants.id, TENANT_A));
    expect(row?.archivedAt).toBeNull();
    expect(row?.status).toBe("active");
  });

  it("returns not-archived for an active tenant (idempotent)", async () => {
    const result = await restoreTenant(harness.db, { tenantId: TENANT_A });
    expect(result.restored).toBe(false);
    expect(result.reason).toBe("not-archived");
  });

  it("returns not-found for unknown tenant", async () => {
    const result = await restoreTenant(harness.db, {
      tenantId: "01900000-0000-7000-8000-deadbeefdead",
    });
    expect(result.restored).toBe(false);
    expect(result.reason).toBe("not-found");
  });

  it("refuses to restore a hard-deleted tenant", async () => {
    // Manually flip to "deleted" status to simulate post-sweep state.
    await harness.db
      .update(tenants)
      .set({ status: "deleted", archivedAt: new Date() })
      .where(eq(tenants.id, TENANT_A));
    const result = await restoreTenant(harness.db, { tenantId: TENANT_A });
    expect(result.restored).toBe(false);
    expect(result.reason).toBe("hard-deleted");
  });
});

describe("runHardDeleteSweep — stage 2", () => {
  let harness: TestDb;
  let schemaManager: DrizzleSchemaManager;
  beforeEach(async () => {
    harness = await createTestDb();
    schemaManager = new DrizzleSchemaManager(harness.db);
    await seedActiveTenant(harness, TENANT_A);
    await seedActiveTenant(harness, TENANT_B);
    await seedActiveTenant(harness, TENANT_C);
  });
  afterEach(async () => {
    await harness.close();
  });

  it("DROPs schemas + flips status to 'deleted' for past-retention archived tenants", async () => {
    // Archive A + B at t=0, run sweep with `now` advanced past retention.
    await archiveTenant(harness.db, { tenantId: TENANT_A });
    await archiveTenant(harness.db, { tenantId: TENANT_B });
    // Leave C active.

    const oneMinuteFromNow = new Date(Date.now() + 60_000 + 30 * 24 * 60 * 60 * 1000);
    const report = await runHardDeleteSweep(harness.db, schemaManager, {
      now: () => oneMinuteFromNow,
    });

    expect(report.allSucceeded).toBe(true);
    expect(report.outcomes).toHaveLength(2);
    expect(new Set(report.outcomes.map((o) => o.tenantId))).toEqual(
      new Set([TENANT_A, TENANT_B]),
    );

    // Schemas gone for A + B; C still present.
    const remaining = await harness.client.query<{ schema_name: string }>(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name`,
    );
    expect(remaining.rows.map((r) => r.schema_name)).toEqual([tenantSchemaName(TENANT_C)]);

    // platform.tenants status flipped to 'deleted' for A + B.
    const rows = await harness.db.select().from(tenants);
    const byId = new Map(rows.map((r) => [r.id, r.status]));
    expect(byId.get(TENANT_A)).toBe("deleted");
    expect(byId.get(TENANT_B)).toBe("deleted");
    expect(byId.get(TENANT_C)).toBe("active");

    // platform.tenant_archive_log got deleted_at stamped.
    const logs = await harness.db.select().from(tenantArchiveLog);
    expect(logs.filter((l) => l.deletedAt !== null)).toHaveLength(2);
  });

  it("legal_hold blocks hard delete; surfaces in blockedByLegalHold list", async () => {
    await archiveTenant(harness.db, { tenantId: TENANT_A });
    await harness.db
      .update(tenants)
      .set({ legalHold: true })
      .where(eq(tenants.id, TENANT_A));

    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const report = await runHardDeleteSweep(harness.db, schemaManager, {
      now: () => future,
    });

    expect(report.outcomes).toHaveLength(0);
    expect(report.blockedByLegalHold).toHaveLength(1);
    expect(report.blockedByLegalHold[0]?.tenantId).toBe(TENANT_A);

    // Schema still present.
    const remaining = await harness.client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM information_schema.schemata WHERE schema_name = $1`,
      [tenantSchemaName(TENANT_A)],
    );
    expect(remaining.rows[0]?.count).toBe("1");
  });

  it("respects the retention window — tenants archived less than retentionMs ago are skipped", async () => {
    await archiveTenant(harness.db, { tenantId: TENANT_A });

    const report = await runHardDeleteSweep(harness.db, schemaManager, {
      retentionMs: 30 * 24 * 60 * 60 * 1000,
      // No `now` override — real clock; A was just archived.
    });
    expect(report.candidates).toHaveLength(0);
    expect(report.outcomes).toHaveLength(0);
  });

  it("dry-run lists candidates without dropping schemas", async () => {
    await archiveTenant(harness.db, { tenantId: TENANT_A });
    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const report = await runHardDeleteSweep(harness.db, schemaManager, {
      now: () => future,
      dryRun: true,
    });
    expect(report.candidates).toHaveLength(1);
    expect(report.outcomes).toHaveLength(0); // no drops happened

    // Schema still on disk.
    const present = await harness.client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM information_schema.schemata WHERE schema_name = $1`,
      [tenantSchemaName(TENANT_A)],
    );
    expect(present.rows[0]?.count).toBe("1");
  });
});

describe("runTenantDoctor", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
  });
  afterEach(async () => {
    await harness.close();
  });

  it("reports all tenants + legal holds + past-retention archives", async () => {
    await seedActiveTenant(harness, TENANT_A);
    await seedActiveTenant(harness, TENANT_B);
    await seedActiveTenant(harness, TENANT_C);
    await archiveTenant(harness.db, { tenantId: TENANT_B });
    await harness.db
      .update(tenants)
      .set({ legalHold: true })
      .where(eq(tenants.id, TENANT_C));

    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const report = await runTenantDoctor(harness.db, { now: () => future });

    expect(report.tenants).toHaveLength(3);
    expect(report.legalHolds.map((t) => t.tenantId)).toEqual([TENANT_C]);
    expect(report.readyForHardDelete.map((t) => t.tenantId)).toEqual([TENANT_B]);
    expect(report.orphanedSchemas).toEqual([]);
    expect(report.missingSchemas).toEqual([]);
  });

  it("detects orphaned schemas (tenant_<hex> with no row in platform.tenants)", async () => {
    await seedActiveTenant(harness, TENANT_A);
    // Manually create an orphan schema.
    const orphan = `tenant_${"a".repeat(32)}`;
    await harness.client.exec(`CREATE SCHEMA ${orphan}`);

    const report = await runTenantDoctor(harness.db);
    expect(report.orphanedSchemas).toEqual([orphan]);
  });

  it("detects missing schemas (active tenant row without DB schema)", async () => {
    // Seed a tenant row but don't CREATE SCHEMA — simulates mid-saga death.
    const reg = new DrizzleTenantRegistry(harness.db);
    await reg.reserveTenant({
      tenantId: TENANT_A,
      name: "Half-Provisioned",
      slug: "half",
      plan: "free",
      ownerId: "00000000-0000-0000-0000-000000000001",
    });
    await reg.markStatus({ tenantId: TENANT_A, status: "active" });

    const report = await runTenantDoctor(harness.db);
    expect(report.missingSchemas).toEqual([
      { tenantId: TENANT_A, expectedSchema: tenantSchemaName(TENANT_A) },
    ]);
  });

  it("excludes legal-hold tenants from readyForHardDelete even if past retention", async () => {
    await seedActiveTenant(harness, TENANT_A);
    await archiveTenant(harness.db, { tenantId: TENANT_A });
    await harness.db
      .update(tenants)
      .set({ legalHold: true })
      .where(eq(tenants.id, TENANT_A));

    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const report = await runTenantDoctor(harness.db, { now: () => future });
    expect(report.legalHolds.map((t) => t.tenantId)).toEqual([TENANT_A]);
    expect(report.readyForHardDelete).toEqual([]);
  });
});

describe("Full archival lifecycle — archive → restore → archive → hard-delete", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedActiveTenant(harness, TENANT_A);
  });
  afterEach(async () => {
    await harness.close();
  });

  it("round-trips through all states correctly", async () => {
    // Archive
    const a1 = await archiveTenant(harness.db, { tenantId: TENANT_A, reason: "first" });
    expect(a1.archivedFreshly).toBe(true);

    // Restore
    const r1 = await restoreTenant(harness.db, { tenantId: TENANT_A });
    expect(r1.restored).toBe(true);

    let [row] = await harness.db.select().from(tenants).where(eq(tenants.id, TENANT_A));
    expect(row?.status).toBe("active");
    expect(row?.archivedAt).toBeNull();

    // Archive again — should be a fresh archive (new audit row)
    const a2 = await archiveTenant(harness.db, { tenantId: TENANT_A, reason: "second" });
    expect(a2.archivedFreshly).toBe(true);

    const logs = await harness.db.select().from(tenantArchiveLog);
    expect(logs).toHaveLength(2);

    // Hard delete after retention
    const schemaManager = new DrizzleSchemaManager(harness.db);
    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const sweep = await runHardDeleteSweep(harness.db, schemaManager, {
      now: () => future,
    });
    expect(sweep.allSucceeded).toBe(true);

    [row] = await harness.db.select().from(tenants).where(eq(tenants.id, TENANT_A));
    expect(row?.status).toBe("deleted");

    // Restore after hard-delete refuses.
    const r2 = await restoreTenant(harness.db, { tenantId: TENANT_A });
    expect(r2.restored).toBe(false);
    expect(r2.reason).toBe("hard-deleted");
  });
});
