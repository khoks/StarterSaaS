import { describe, expect, it } from "vitest";

import type { Session } from "../../src/contracts/session.js";
import {
  DEFAULT_TENANT_ROLES,
  hasAnyRole,
  isPlatformAdmin,
  PLATFORM_ADMIN_ROLE,
} from "../../src/rbac/checks.js";

function makeSession(roleLabel: string | null): Session {
  return {
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      email: "ada@example.com",
      name: null,
      image: null,
      emailVerified: null,
      totpEnabled: false,
    },
    activeTenant:
      roleLabel === null
        ? null
        : {
            tenantId: "00000000-0000-0000-0000-000000000002",
            roleLabel,
            joinedAt: new Date("2026-01-01T00:00:00Z"),
          },
    expires: new Date("2026-12-31T00:00:00Z"),
  };
}

describe("hasAnyRole", () => {
  it("returns ok when the active role is in the allowed list", () => {
    const result = hasAnyRole(makeSession("admin"), ["admin", "member"]);
    expect(result).toEqual({ ok: true });
  });

  it("rejects when active role is not in the allowed list", () => {
    const result = hasAnyRole(makeSession("viewer"), ["admin"]);
    expect(result).toEqual({ ok: false, reason: "role-mismatch" });
  });

  it("rejects when there is no active tenant", () => {
    const result = hasAnyRole(makeSession(null), ["admin"]);
    expect(result).toEqual({ ok: false, reason: "no-active-tenant" });
  });

  it("accepts the platform_admin role when explicitly allowed", () => {
    const result = hasAnyRole(makeSession(PLATFORM_ADMIN_ROLE), [PLATFORM_ADMIN_ROLE]);
    expect(result).toEqual({ ok: true });
  });
});

describe("isPlatformAdmin", () => {
  it("returns true when the active tenant role label equals PLATFORM_ADMIN_ROLE", () => {
    expect(isPlatformAdmin(makeSession(PLATFORM_ADMIN_ROLE))).toBe(true);
  });

  it("returns false for ordinary tenant roles", () => {
    for (const role of DEFAULT_TENANT_ROLES) {
      expect(isPlatformAdmin(makeSession(role))).toBe(false);
    }
  });

  it("returns false when there is no active tenant", () => {
    expect(isPlatformAdmin(makeSession(null))).toBe(false);
  });
});

describe("DEFAULT_TENANT_ROLES", () => {
  it("contains the three seeded roles from ADR-0004 step 4", () => {
    expect(DEFAULT_TENANT_ROLES).toContain("admin");
    expect(DEFAULT_TENANT_ROLES).toContain("member");
    expect(DEFAULT_TENANT_ROLES).toContain("viewer");
  });
});
