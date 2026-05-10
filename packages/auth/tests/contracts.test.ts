/**
 * Smoke tests for the Zod contracts.
 *
 * Schemas are the source-of-truth for type shape per D-25 — these tests
 * verify validation behavior, not implementation. Property tests + boundary
 * cases land in follow-up PRs as flows ship.
 */

import { describe, it, expect } from "vitest";

import {
  AuditActionSchema,
  AuditEntryInputSchema,
  EmailSchema,
  MagicLinkRequestSchema,
  PasswordResetCompleteSchema,
  PasswordResetRequestSchema,
  PasswordSchema,
  SessionSchema,
  SessionTenantSchema,
  SessionUserSchema,
  SignInInputSchema,
  SignUpInputSchema,
} from "../src/contracts/index.js";

describe("EmailSchema", () => {
  it("accepts valid emails and normalizes case", () => {
    const result = EmailSchema.parse("  Ada@Example.COM  ");
    expect(result).toBe("ada@example.com");
  });

  it("rejects invalid emails", () => {
    expect(() => EmailSchema.parse("not-an-email")).toThrow();
  });
});

describe("PasswordSchema", () => {
  it("requires 12-char minimum (per ADR-0007)", () => {
    expect(() => PasswordSchema.parse("short")).toThrow();
    expect(() => PasswordSchema.parse("exactly-12ch")).not.toThrow();
  });
});

describe("SignUpInputSchema", () => {
  it("accepts valid signup input with default name", () => {
    const parsed = SignUpInputSchema.parse({
      email: "ada@example.com",
      password: "twelve-chars",
    });
    expect(parsed.name).toBeNull();
    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects password shorter than 12", () => {
    expect(() =>
      SignUpInputSchema.parse({ email: "ada@example.com", password: "short" }),
    ).toThrow();
  });
});

describe("SignInInputSchema", () => {
  it("accepts optional TOTP code", () => {
    expect(() =>
      SignInInputSchema.parse({
        email: "ada@example.com",
        password: "any-non-empty",
        totpCode: "123456",
      }),
    ).not.toThrow();
  });

  it("rejects non-6-digit TOTP code", () => {
    expect(() =>
      SignInInputSchema.parse({
        email: "ada@example.com",
        password: "any-non-empty",
        totpCode: "12345",
      }),
    ).toThrow();
  });
});

describe("PasswordResetRequestSchema / PasswordResetCompleteSchema", () => {
  it("request schema accepts an email", () => {
    expect(() => PasswordResetRequestSchema.parse({ email: "ada@example.com" })).not.toThrow();
  });

  it("complete schema requires token + 12-char password", () => {
    expect(() =>
      PasswordResetCompleteSchema.parse({ token: "tok", newPassword: "twelve-chars" }),
    ).not.toThrow();
    expect(() =>
      PasswordResetCompleteSchema.parse({ token: "tok", newPassword: "short" }),
    ).toThrow();
  });
});

describe("MagicLinkRequestSchema", () => {
  it("accepts an email", () => {
    expect(() => MagicLinkRequestSchema.parse({ email: "ada@example.com" })).not.toThrow();
  });
});

describe("SessionSchema", () => {
  const validUser = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "ada@example.com",
    name: null,
    image: null,
    emailVerified: null,
    totpEnabled: false,
  };

  it("accepts a session with null activeTenant (multi-tenant pre-pick)", () => {
    expect(() =>
      SessionSchema.parse({
        user: validUser,
        activeTenant: null,
        expires: new Date("2026-12-31T00:00:00Z"),
      }),
    ).not.toThrow();
  });

  it("accepts a session with active tenant set", () => {
    const validTenant = {
      tenantId: "00000000-0000-0000-0000-000000000002",
      roleLabel: "admin",
      joinedAt: new Date("2026-01-01T00:00:00Z"),
    };
    expect(() => SessionTenantSchema.parse(validTenant)).not.toThrow();
    expect(() => SessionUserSchema.parse(validUser)).not.toThrow();
    expect(() =>
      SessionSchema.parse({
        user: validUser,
        activeTenant: validTenant,
        expires: new Date("2026-12-31T00:00:00Z"),
      }),
    ).not.toThrow();
  });
});

describe("AuditActionSchema / AuditEntryInputSchema", () => {
  it("accepts known actions", () => {
    expect(() => AuditActionSchema.parse("user.sign_in.success")).not.toThrow();
    expect(() => AuditActionSchema.parse("user_tenant.role_changed")).not.toThrow();
  });

  it("rejects unknown actions", () => {
    expect(() => AuditActionSchema.parse("user.frobnicate")).toThrow();
  });

  it("audit input accepts null user/tenant for pre-auth events", () => {
    expect(() =>
      AuditEntryInputSchema.parse({
        userId: null,
        tenantId: null,
        action: "user.sign_in.failure",
        details: { reason: "wrong_password" },
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      }),
    ).not.toThrow();
  });
});
