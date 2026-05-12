/**
 * Smoke tests for the tenancy Drizzle schema definitions.
 *
 * These verify the schema objects have the expected structure (column names,
 * types compile correctly, inferred types match expectations). Real DB
 * integration tests land with sub-PR #3 when the provisioning saga exercises
 * the full CRUD round-trip against a Postgres test instance.
 */

import { describe, expect, it } from "vitest";

import * as schema from "../src/db/schema.js";

describe("tenancy schema — Drizzle table objects", () => {
  it("exports `platform` pgSchema + the four tables", () => {
    expect(schema.platform).toBeDefined();
    expect(schema.tenants).toBeDefined();
    expect(schema.tenantMigrations).toBeDefined();
    expect(schema.tenantArchiveLog).toBeDefined();
    expect(schema.sagaInstances).toBeDefined();
  });

  it("`tenants` exposes id + name + slug + plan + status columns via $inferSelect type", () => {
    // Compile-time check: the inferred type must be assignable to an object with these keys.
    type T = schema.Tenant;
    const sample: T = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Acme",
      slug: "acme",
      plan: "free",
      status: "provisioning",
      ownerId: null,
      archivedAt: null,
      legalHold: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(sample.name).toBe("Acme");
  });

  it("`sagaInstances` row type aligns with @starter-saas/saga's SagaInstance shape", () => {
    type Row = schema.SagaInstanceRow;
    const sample: Row = {
      instanceId: "00000000-0000-0000-0000-000000000002",
      sagaName: "tenant.provisioning",
      status: "in-progress",
      currentStep: 3,
      state: { whatever: 1 },
      completedSteps: ["a", "b", "c"],
      compensatedSteps: [],
      failureReason: null,
      startedAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };
    expect(sample.currentStep).toBe(3);
    expect(sample.completedSteps).toHaveLength(3);
  });

  it("`TenantStatus` union compiles to the four lifecycle values", () => {
    // Compile-time check via direct assignment.
    const v1: schema.TenantStatus = "provisioning";
    const v2: schema.TenantStatus = "active";
    const v3: schema.TenantStatus = "archived";
    const v4: schema.TenantStatus = "deleted";
    expect([v1, v2, v3, v4]).toHaveLength(4);
  });
});
