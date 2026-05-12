import { describe, expect, it } from "vitest";

import {
  ArchiveTenantInputSchema,
  CreateTenantInputSchema,
  TenantPlanSchema,
  TenantSlugSchema,
  TenantStatusSchema,
} from "../src/contracts.js";

describe("TenantSlugSchema", () => {
  it("accepts lowercase alphanumeric + hyphens", () => {
    expect(() => TenantSlugSchema.parse("acme-corp")).not.toThrow();
    expect(() => TenantSlugSchema.parse("a1")).not.toThrow();
    expect(() => TenantSlugSchema.parse("multi-part-name-here")).not.toThrow();
  });

  it("rejects uppercase letters", () => {
    expect(() => TenantSlugSchema.parse("Acme-Corp")).toThrow();
  });

  it("rejects underscores + spaces + leading/trailing hyphens", () => {
    expect(() => TenantSlugSchema.parse("acme_corp")).toThrow();
    expect(() => TenantSlugSchema.parse("acme corp")).toThrow();
    expect(() => TenantSlugSchema.parse("-acme")).toThrow();
    expect(() => TenantSlugSchema.parse("acme-")).toThrow();
  });

  it("rejects empty / too short / too long", () => {
    expect(() => TenantSlugSchema.parse("")).toThrow();
    expect(() => TenantSlugSchema.parse("a")).toThrow();
    expect(() => TenantSlugSchema.parse("a".repeat(64))).toThrow();
  });
});

describe("TenantPlanSchema / TenantStatusSchema", () => {
  it("plan accepts the four known values", () => {
    for (const v of ["free", "pro", "enterprise", "custom"]) {
      expect(() => TenantPlanSchema.parse(v)).not.toThrow();
    }
    expect(() => TenantPlanSchema.parse("unknown")).toThrow();
  });

  it("status accepts the four lifecycle values", () => {
    for (const v of ["provisioning", "active", "archived", "deleted"]) {
      expect(() => TenantStatusSchema.parse(v)).not.toThrow();
    }
    expect(() => TenantStatusSchema.parse("unknown")).toThrow();
  });
});

describe("CreateTenantInputSchema", () => {
  it("accepts a valid input with default plan", () => {
    const parsed = CreateTenantInputSchema.parse({
      name: "Acme Corporation",
      slug: "acme-corp",
      ownerId: "00000000-0000-0000-0000-000000000001",
    });
    expect(parsed.plan).toBe("free");
  });

  it("rejects empty name or invalid slug", () => {
    expect(() =>
      CreateTenantInputSchema.parse({
        name: "",
        slug: "acme",
        ownerId: "00000000-0000-0000-0000-000000000001",
      }),
    ).toThrow();
    expect(() =>
      CreateTenantInputSchema.parse({
        name: "Acme",
        slug: "ACME",
        ownerId: "00000000-0000-0000-0000-000000000001",
      }),
    ).toThrow();
  });

  it("rejects non-UUID ownerId", () => {
    expect(() =>
      CreateTenantInputSchema.parse({
        name: "Acme",
        slug: "acme",
        ownerId: "not-a-uuid",
      }),
    ).toThrow();
  });
});

describe("ArchiveTenantInputSchema", () => {
  it("accepts minimal input with default nulls", () => {
    const parsed = ArchiveTenantInputSchema.parse({
      tenantId: "00000000-0000-0000-0000-000000000001",
    });
    expect(parsed.reason).toBeNull();
    expect(parsed.requestingUserId).toBeNull();
  });

  it("accepts reason + requestingUserId", () => {
    const parsed = ArchiveTenantInputSchema.parse({
      tenantId: "00000000-0000-0000-0000-000000000001",
      reason: "Adopter request",
      requestingUserId: "00000000-0000-0000-0000-000000000002",
    });
    expect(parsed.reason).toBe("Adopter request");
  });

  it("rejects oversized reason", () => {
    expect(() =>
      ArchiveTenantInputSchema.parse({
        tenantId: "00000000-0000-0000-0000-000000000001",
        reason: "x".repeat(1001),
      }),
    ).toThrow();
  });
});
