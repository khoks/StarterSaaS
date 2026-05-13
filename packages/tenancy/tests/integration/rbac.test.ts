/**
 * Integration tests for the per-tenant RBAC subsystem against PGlite.
 * Covers:
 *   - RBAC_MIGRATION applied alongside adopter migrations creates roles + user_roles
 *   - DrizzleTenantSeeder seeds 3 default roles + assigns owner as admin
 *   - loadUserRbac aggregates role permissions for a user
 *   - requireRole / requirePermission middleware enforce 401 / 403 / pass cases
 *   - Full provisioning saga end-to-end with DrizzleTenantSeeder wired in:
 *     after saga completes, the owner has admin role in the new tenant schema
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { InMemoryEventBus } from "@starter-saas/event-bus";
import { SagaRunner } from "@starter-saas/saga";

import {
  DEFAULT_TENANT_ROLE_PERMISSIONS,
  DEFAULT_TENANT_ROLES,
  DrizzleSagaStore,
  DrizzleSchemaManager,
  DrizzleTenantMigrator,
  DrizzleTenantRegistry,
  DrizzleTenantSeeder,
  RBAC_MIGRATION,
  loadUserRbac,
  noopBillingRegistry,
  noopNotificationsSender,
  noopSecretsProvider,
  permissionMatches,
  requirePermission,
  requireRole,
  runTenantMigrations,
  runTenantProvisioning,
  tenantSchemaName,
  type CreateTenantInput,
  type ProvisioningDeps,
  type RbacReply,
  type RbacRequest,
} from "../../src/index.js";
import { createTestDb, type TestDb } from "../../src/testing/index.js";

const TENANT_A = "01900000-0000-7000-8000-00000000000a";
const OWNER = "00000000-0000-0000-0000-000000000001";
const NON_OWNER = "00000000-0000-0000-0000-000000000099";

async function seedTenantWithRbacTables(harness: TestDb, tenantId: string): Promise<void> {
  // Insert platform.tenants row
  const reg = new DrizzleTenantRegistry(harness.db);
  await reg.reserveTenant({
    tenantId,
    name: `Tenant ${tenantId.slice(-4)}`,
    slug: `tenant-${tenantId.slice(-4)}`,
    plan: "free",
    ownerId: OWNER,
  });
  await reg.markStatus({ tenantId, status: "active" });

  // CREATE SCHEMA + run RBAC migration
  await harness.client.exec(`CREATE SCHEMA ${tenantSchemaName(tenantId)}`);
  const migrateReport = await runTenantMigrations(harness.db, [RBAC_MIGRATION], {
    tenantId,
  });
  expect(migrateReport.allSucceeded).toBe(true);
}

describe("RBAC_MIGRATION", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedTenantWithRbacTables(harness, TENANT_A);
  });
  afterEach(async () => {
    await harness.close();
  });

  it("creates roles + user_roles tables in the tenant schema", async () => {
    const schema = tenantSchemaName(TENANT_A);
    const result = await harness.client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
      [schema],
    );
    expect(result.rows.map((r) => r.table_name)).toEqual(["roles", "user_roles"]);
  });

  it("enforces UNIQUE(name) on roles", async () => {
    const schema = tenantSchemaName(TENANT_A);
    await harness.client.exec(`INSERT INTO ${schema}.roles (name) VALUES ('admin')`);
    await expect(
      harness.client.exec(`INSERT INTO ${schema}.roles (name) VALUES ('admin')`),
    ).rejects.toThrow(/unique|duplicate/i);
  });
});

describe("DrizzleTenantSeeder", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedTenantWithRbacTables(harness, TENANT_A);
  });
  afterEach(async () => {
    await harness.close();
  });

  it("inserts the 3 default roles with correct permission sets", async () => {
    const seeder = new DrizzleTenantSeeder(harness.db);
    await seeder.seedDefaults({
      tenantId: TENANT_A,
      schemaName: tenantSchemaName(TENANT_A),
      ownerId: OWNER,
      plan: "free",
    });

    const schema = tenantSchemaName(TENANT_A);
    const rows = await harness.client.query<{ name: string; permissions: string[] }>(
      `SELECT name, permissions FROM ${schema}.roles ORDER BY name`,
    );
    const byName = new Map(rows.rows.map((r) => [r.name, r.permissions]));
    expect([...byName.keys()].sort()).toEqual([...DEFAULT_TENANT_ROLES].sort());
    expect(byName.get("admin")).toEqual(DEFAULT_TENANT_ROLE_PERMISSIONS.admin);
    expect(byName.get("member")).toEqual(DEFAULT_TENANT_ROLE_PERMISSIONS.member);
    expect(byName.get("viewer")).toEqual(DEFAULT_TENANT_ROLE_PERMISSIONS.viewer);
  });

  it("assigns owner to the admin role", async () => {
    const seeder = new DrizzleTenantSeeder(harness.db);
    await seeder.seedDefaults({
      tenantId: TENANT_A,
      schemaName: tenantSchemaName(TENANT_A),
      ownerId: OWNER,
      plan: "free",
    });

    const rbac = await loadUserRbac(harness.db, TENANT_A, OWNER);
    expect(rbac).not.toBeNull();
    expect(rbac?.roles.map((r) => r.name)).toEqual(["admin"]);
    expect(rbac?.permissions).toContain("*");
  });
});

describe("loadUserRbac()", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedTenantWithRbacTables(harness, TENANT_A);
    await new DrizzleTenantSeeder(harness.db).seedDefaults({
      tenantId: TENANT_A,
      schemaName: tenantSchemaName(TENANT_A),
      ownerId: OWNER,
      plan: "free",
    });
  });
  afterEach(async () => {
    await harness.close();
  });

  it("returns null for a user with no roles", async () => {
    const rbac = await loadUserRbac(harness.db, TENANT_A, NON_OWNER);
    expect(rbac).toBeNull();
  });

  it("aggregates permissions across multiple roles", async () => {
    // Assign NON_OWNER to both member + viewer.
    const schema = tenantSchemaName(TENANT_A);
    await harness.client.exec(
      `INSERT INTO ${schema}.user_roles (user_id, role_id) SELECT '${NON_OWNER}'::uuid, id FROM ${schema}.roles WHERE name IN ('member', 'viewer')`,
    );

    const rbac = await loadUserRbac(harness.db, TENANT_A, NON_OWNER);
    expect(rbac).not.toBeNull();
    expect(rbac?.roles.map((r) => r.name).sort()).toEqual(["member", "viewer"]);
    // Deduplicated permission set: read:* + write:own
    expect(new Set(rbac?.permissions)).toEqual(new Set(["read:*", "write:own"]));
  });
});

describe("permissionMatches()", () => {
  it("wildcard '*' grants everything", () => {
    expect(permissionMatches(["*"], "read:anything")).toBe(true);
    expect(permissionMatches(["*"], "write:secrets")).toBe(true);
  });
  it("'read:*' grants any read", () => {
    expect(permissionMatches(["read:*"], "read:posts")).toBe(true);
    expect(permissionMatches(["read:*"], "read:users")).toBe(true);
  });
  it("'read:*' does NOT grant 'write:posts'", () => {
    expect(permissionMatches(["read:*"], "write:posts")).toBe(false);
  });
  it("exact match", () => {
    expect(permissionMatches(["read:posts"], "read:posts")).toBe(true);
    expect(permissionMatches(["read:posts"], "read:users")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Middleware tests — structural fakes for Fastify request/reply.
// ---------------------------------------------------------------------------

interface CapturedReply {
  status: number | null;
  payload: unknown;
  reply: RbacReply;
}

function makeReply(): CapturedReply {
  let status: number | null = null;
  let payload: unknown = undefined;
  const reply: RbacReply = {
    code(s) {
      status = s;
      return reply;
    },
    send(p) {
      payload = p;
      return reply;
    },
  };
  return {
    get status() { return status; },
    get payload() { return payload; },
    reply,
  };
}

function makeRequest(headers: Record<string, string> = {}): RbacRequest {
  return { headers };
}

describe("requireRole middleware", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedTenantWithRbacTables(harness, TENANT_A);
    await new DrizzleTenantSeeder(harness.db).seedDefaults({
      tenantId: TENANT_A,
      schemaName: tenantSchemaName(TENANT_A),
      ownerId: OWNER,
      plan: "free",
    });
  });
  afterEach(async () => {
    await harness.close();
  });

  it("401 when tenant or user header missing", async () => {
    const handler = requireRole(harness.db, ["admin"]);
    const cap = makeReply();
    await handler(makeRequest({}), cap.reply);
    expect(cap.status).toBe(401);
  });

  it("403 when user has no roles in the tenant", async () => {
    const handler = requireRole(harness.db, ["admin"]);
    const cap = makeReply();
    await handler(
      makeRequest({ "x-tenant-id": TENANT_A, "x-user-id": NON_OWNER }),
      cap.reply,
    );
    expect(cap.status).toBe(403);
    expect((cap.payload as { error: string }).error).toBe("no_roles");
  });

  it("403 when user has roles but none match", async () => {
    // Assign NON_OWNER to viewer (not admin)
    const schema = tenantSchemaName(TENANT_A);
    await harness.client.exec(
      `INSERT INTO ${schema}.user_roles (user_id, role_id) SELECT '${NON_OWNER}'::uuid, id FROM ${schema}.roles WHERE name = 'viewer'`,
    );

    const handler = requireRole(harness.db, ["admin"]);
    const cap = makeReply();
    await handler(
      makeRequest({ "x-tenant-id": TENANT_A, "x-user-id": NON_OWNER }),
      cap.reply,
    );
    expect(cap.status).toBe(403);
    expect((cap.payload as { error: string }).error).toBe("role_required");
  });

  it("passes through when the user has the required role", async () => {
    const handler = requireRole(harness.db, ["admin"]);
    const cap = makeReply();
    await handler(
      makeRequest({ "x-tenant-id": TENANT_A, "x-user-id": OWNER }),
      cap.reply,
    );
    expect(cap.status).toBeNull(); // no reply.code() call → middleware passed through
  });
});

describe("requirePermission middleware", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
    await seedTenantWithRbacTables(harness, TENANT_A);
    await new DrizzleTenantSeeder(harness.db).seedDefaults({
      tenantId: TENANT_A,
      schemaName: tenantSchemaName(TENANT_A),
      ownerId: OWNER,
      plan: "free",
    });
  });
  afterEach(async () => {
    await harness.close();
  });

  it("admin (perms=['*']) passes for any permission", async () => {
    const handler = requirePermission(harness.db, "delete:tenants");
    const cap = makeReply();
    await handler(
      makeRequest({ "x-tenant-id": TENANT_A, "x-user-id": OWNER }),
      cap.reply,
    );
    expect(cap.status).toBeNull();
  });

  it("viewer (perms=['read:*']) passes for read:posts", async () => {
    const schema = tenantSchemaName(TENANT_A);
    await harness.client.exec(
      `INSERT INTO ${schema}.user_roles (user_id, role_id) SELECT '${NON_OWNER}'::uuid, id FROM ${schema}.roles WHERE name = 'viewer'`,
    );
    const handler = requirePermission(harness.db, "read:posts");
    const cap = makeReply();
    await handler(
      makeRequest({ "x-tenant-id": TENANT_A, "x-user-id": NON_OWNER }),
      cap.reply,
    );
    expect(cap.status).toBeNull();
  });

  it("viewer fails for write:posts", async () => {
    const schema = tenantSchemaName(TENANT_A);
    await harness.client.exec(
      `INSERT INTO ${schema}.user_roles (user_id, role_id) SELECT '${NON_OWNER}'::uuid, id FROM ${schema}.roles WHERE name = 'viewer'`,
    );
    const handler = requirePermission(harness.db, "write:posts");
    const cap = makeReply();
    await handler(
      makeRequest({ "x-tenant-id": TENANT_A, "x-user-id": NON_OWNER }),
      cap.reply,
    );
    expect(cap.status).toBe(403);
    expect((cap.payload as { error: string }).error).toBe("permission_required");
  });
});

describe("Provisioning saga end-to-end with DrizzleTenantSeeder", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
  });
  afterEach(async () => {
    await harness.close();
  });

  it("post-saga: tenant has roles + user_roles seeded; owner is admin", async () => {
    const VALID_INPUT: CreateTenantInput = {
      name: "Acme",
      slug: "acme",
      plan: "free",
      ownerId: OWNER,
    };
    const deps: ProvisioningDeps = {
      registry: new DrizzleTenantRegistry(harness.db),
      schemaManager: new DrizzleSchemaManager(harness.db),
      migrator: new DrizzleTenantMigrator(harness.db, [RBAC_MIGRATION]),
      seeder: new DrizzleTenantSeeder(harness.db),
      secretsProvider: noopSecretsProvider,
      billingRegistry: noopBillingRegistry,
      notifications: noopNotificationsSender,
      eventBus: new InMemoryEventBus(),
    };
    const runner = new SagaRunner(new DrizzleSagaStore(harness.db));
    const result = await runTenantProvisioning(runner, deps, VALID_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Find the new tenant ID, then verify the owner has admin role in the new schema.
    const tenantId = result.finalState.tenantId;
    const rbac = await loadUserRbac(harness.db, tenantId, OWNER);
    expect(rbac).not.toBeNull();
    expect(rbac?.roles.map((r) => r.name)).toEqual(["admin"]);
    expect(rbac?.permissions).toContain("*");

    await deps.eventBus.shutdown();
  });
});
