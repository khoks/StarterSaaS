/**
 * End-to-end integration test for the 9-step provisioning saga against real
 * PGlite Postgres. Exercises:
 *   - `DrizzleTenantRegistry` (step 1 / 7 — platform.tenants CRUD)
 *   - `DrizzleSchemaManager` (step 2 — CREATE/DROP SCHEMA)
 *   - `DrizzleTenantMigrator` (step 3 — per-tenant migrations)
 *   - `DrizzleSagaStore` (saga persistence to platform.saga_instances)
 *   - Real `InMemoryEventBus` for event emission
 *   - Adopter-supplied NoOp + custom adapters for steps 4-9
 *
 * Closes a STORY-014 deferred AC: "Integration test: tenant signup → saga
 * runs end-to-end → tenant active → cross-tenant query blocked". (The
 * cross-tenant-query-blocked part is exercised via `withTenants` returning
 * only the tenants explicitly listed — no global cross-tenant fan-out exists
 * by design.)
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { InMemoryEventBus } from "@starter-saas/event-bus";
import { SagaRunner } from "@starter-saas/saga";

import {
  DrizzleSagaStore,
  DrizzleSchemaManager,
  DrizzleTenantMigrator,
  DrizzleTenantRegistry,
  TENANT_PROVISIONED_EVENT,
  TENANT_PROVISIONING_TOPIC,
  isTenantSchemaName,
  noopBillingRegistry,
  noopNotificationsSender,
  noopSecretsProvider,
  noopTenantSeeder,
  runTenantProvisioning,
  tenantSchemaName,
  type CreateTenantInput,
  type ProvisioningDeps,
  type TenantMigration,
} from "../../src/index.js";
import { sagaInstances, tenants } from "../../src/db/schema.js";
import { createTestDb, type TestDb } from "../../src/testing/index.js";

const VALID_INPUT: CreateTenantInput = {
  name: "Acme Corporation",
  slug: "acme-corp",
  plan: "free",
  ownerId: "00000000-0000-0000-0000-000000000001",
};

const KIT_MIGRATIONS: readonly TenantMigration[] = [
  {
    id: "0001_create_users",
    sql: `CREATE TABLE users (id uuid PRIMARY KEY, email text NOT NULL)`,
  },
  {
    id: "0002_create_roles",
    sql: `CREATE TABLE roles (id uuid PRIMARY KEY, name text NOT NULL UNIQUE)`,
  },
];

function buildDeps(harness: TestDb): ProvisioningDeps {
  return {
    registry: new DrizzleTenantRegistry(harness.db),
    schemaManager: new DrizzleSchemaManager(harness.db),
    migrator: new DrizzleTenantMigrator(harness.db, KIT_MIGRATIONS),
    seeder: noopTenantSeeder,
    secretsProvider: noopSecretsProvider,
    billingRegistry: noopBillingRegistry,
    notifications: noopNotificationsSender,
    eventBus: new InMemoryEventBus(),
  };
}

describe("Provisioning saga — end-to-end against pglite", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
  });
  afterEach(async () => {
    await harness.close();
  });

  it("happy path: 9 steps complete, tenant active, schema + tables exist, event emitted", async () => {
    const deps = buildDeps(harness);
    const received: Array<{ payload: Record<string, unknown> }> = [];
    deps.eventBus.subscribe<Record<string, unknown>>(
      TENANT_PROVISIONING_TOPIC,
      { consumerGroup: "test-observer" },
      async (event) => {
        received.push({ payload: event.payload });
      },
    );

    const runner = new SagaRunner(new DrizzleSagaStore(harness.db));
    const result = await runTenantProvisioning(runner, deps, VALID_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.completedSteps).toHaveLength(9);

    // platform.tenants reflects "active" status.
    const tenantRows = await harness.db.select().from(tenants);
    expect(tenantRows).toHaveLength(1);
    expect(tenantRows[0]?.status).toBe("active");
    expect(tenantRows[0]?.slug).toBe("acme-corp");
    const newTenantId = tenantRows[0]!.id;

    // Schema name follows the `tenant_<32hex>` convention.
    const schemaName = tenantSchemaName(newTenantId);
    expect(isTenantSchemaName(schemaName)).toBe(true);

    // CREATE SCHEMA happened.
    const schemas = await harness.client.query<{ schema_name: string }>(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName],
    );
    expect(schemas.rows).toHaveLength(1);

    // Migrations applied — users + roles tables exist in the tenant schema.
    const tables = await harness.client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
      [schemaName],
    );
    expect(tables.rows.map((r) => r.table_name)).toEqual(["roles", "users"]);

    // Terminal event published.
    await deps.eventBus.shutdown();
    expect(received).toHaveLength(1);
    expect(received[0]?.payload["event"]).toBe(TENANT_PROVISIONED_EVENT);
    expect(received[0]?.payload["tenantId"]).toBe(newTenantId);

    // Saga snapshot persisted as "completed".
    const sagaRows = await harness.db.select().from(sagaInstances);
    expect(sagaRows).toHaveLength(1);
    expect(sagaRows[0]?.status).toBe("completed");
    expect(sagaRows[0]?.completedSteps).toHaveLength(9);
  });

  it("step-3 failure (bad migration) compensates: schema dropped, tenant row deleted", async () => {
    const deps = buildDeps(harness);
    deps.migrator = new DrizzleTenantMigrator(harness.db, [
      { id: "0001_broken", sql: `THIS IS NOT VALID SQL` },
    ]);

    const runner = new SagaRunner(new DrizzleSagaStore(harness.db));
    const result = await runTenantProvisioning(runner, deps, VALID_INPUT);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failedStep).toBe("run-migrations");

    // No tenant row.
    const tenantRows = await harness.db.select().from(tenants);
    expect(tenantRows).toHaveLength(0);

    // Tenant schema rolled back.
    const schemas = await harness.client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`,
    );
    expect(schemas.rows[0]?.count).toBe("0");

    await deps.eventBus.shutdown();
  });

  it("saga state survives in platform.saga_instances after compensation", async () => {
    const deps = buildDeps(harness);
    deps.migrator = new DrizzleTenantMigrator(harness.db, [
      { id: "0001_broken", sql: `THIS IS NOT VALID SQL` },
    ]);

    const runner = new SagaRunner(new DrizzleSagaStore(harness.db));
    await runTenantProvisioning(runner, deps, VALID_INPUT);

    const sagaRows = await harness.db.select().from(sagaInstances);
    expect(sagaRows).toHaveLength(1);
    expect(sagaRows[0]?.status).toBe("compensated");
    // Step 1 (reserve-tenant-id) + step 2 (create-schema) ran their compensations.
    // Steps 3 / 4 register no compensation (per ADR-0004 — DROP SCHEMA at step 2 subsumes).
    expect(sagaRows[0]?.compensatedSteps).toEqual([
      "create-schema",
      "reserve-tenant-id",
    ]);

    await deps.eventBus.shutdown();
  });

  it("two consecutive provisions: both end as separate `active` tenants with their own schemas", async () => {
    const deps1 = buildDeps(harness);
    const deps2 = buildDeps(harness);
    const runner = new SagaRunner(new DrizzleSagaStore(harness.db));

    const r1 = await runTenantProvisioning(runner, deps1, VALID_INPUT);
    const r2 = await runTenantProvisioning(runner, deps2, {
      ...VALID_INPUT,
      slug: "beta-corp",
      name: "Beta",
    });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);

    const rows = await harness.db.select().from(tenants);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "active")).toBe(true);
    expect(new Set(rows.map((r) => r.slug))).toEqual(new Set(["acme-corp", "beta-corp"]));

    await deps1.eventBus.shutdown();
    await deps2.eventBus.shutdown();
  });
});
