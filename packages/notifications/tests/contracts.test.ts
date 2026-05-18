/**
 * Zod contract tests for the notification request + envelope schemas.
 */

import { describe, expect, it } from "vitest";

import {
  EmailRecipientSchema,
  KIT_TEMPLATE_IDS,
  NotificationEmailRequestSchema,
  RenderedEmailSchema,
} from "../src/index.js";

describe("EmailRecipientSchema", () => {
  it("requires a valid email", () => {
    expect(() => EmailRecipientSchema.parse({ email: "a@b.co" })).not.toThrow();
    expect(() => EmailRecipientSchema.parse({ email: "not-an-email" })).toThrow();
  });
  it("name is optional", () => {
    const parsed = EmailRecipientSchema.parse({ email: "a@b.co" });
    expect(parsed.name).toBeUndefined();
  });
});

describe("NotificationEmailRequestSchema", () => {
  it("validates a full request", () => {
    const parsed = NotificationEmailRequestSchema.parse({
      tenantId: "01900000-0000-7000-8000-000000000001",
      templateId: "welcome",
      variables: { tenantName: "Acme", n: 42, active: true },
      to: { email: "owner@acme.test", name: "Owner" },
    });
    expect(parsed.templateId).toBe("welcome");
    expect(parsed.tenantId).toBe("01900000-0000-7000-8000-000000000001");
  });

  it("accepts tenantId: null for cross-tenant emails", () => {
    const parsed = NotificationEmailRequestSchema.parse({
      tenantId: null,
      templateId: "platform-alert",
      variables: {},
      to: { email: "ops@example.com" },
    });
    expect(parsed.tenantId).toBeNull();
  });

  it("rejects non-string|number|boolean variable values", () => {
    expect(() =>
      NotificationEmailRequestSchema.parse({
        tenantId: null,
        templateId: "welcome",
        variables: { nested: { not: "allowed" } },
        to: { email: "x@y.test" },
      }),
    ).toThrow();
  });
});

describe("RenderedEmailSchema", () => {
  it("validates a minimal rendered email", () => {
    const parsed = RenderedEmailSchema.parse({
      to: { email: "x@y.test" },
      subject: "Hi",
      textBody: "Hello world",
      templateId: "welcome",
      tenantId: null,
    });
    expect(parsed.subject).toBe("Hi");
  });
  it("htmlBody + replyTo are optional", () => {
    const parsed = RenderedEmailSchema.parse({
      to: { email: "x@y.test" },
      subject: "Hi",
      textBody: "Hello",
      templateId: "welcome",
      tenantId: null,
      htmlBody: "<p>Hi</p>",
      replyTo: { email: "support@example.com" },
    });
    expect(parsed.htmlBody).toBe("<p>Hi</p>");
    expect(parsed.replyTo?.email).toBe("support@example.com");
  });
});

describe("KIT_TEMPLATE_IDS", () => {
  it("ships exactly the four MVP-1 templates", () => {
    expect([...KIT_TEMPLATE_IDS].sort()).toEqual([
      "email-verification",
      "password-reset",
      "tenant-invitation",
      "welcome",
    ]);
  });
});
