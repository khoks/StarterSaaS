import { describe, expect, it } from "vitest";

import {
  magicLinkEmail,
  passwordResetEmail,
  verificationEmail,
} from "../../src/email/templates.js";

describe("verificationEmail", () => {
  it("includes recipient, subject, URL, and expiry in text + html", () => {
    const message = verificationEmail({
      recipientEmail: "ada@example.com",
      verificationUrl: "https://example.com/verify?token=abc",
      expiresInHours: 24,
    });
    expect(message.to).toBe("ada@example.com");
    expect(message.subject).toMatch(/verify/i);
    expect(message.bodyText).toContain("https://example.com/verify?token=abc");
    expect(message.bodyText).toContain("24 hours");
    expect(message.bodyHtml).toContain("https://example.com/verify?token=abc");
  });
});

describe("passwordResetEmail", () => {
  it("includes recipient, subject, URL, and expiry", () => {
    const message = passwordResetEmail({
      recipientEmail: "ada@example.com",
      resetUrl: "https://example.com/reset?token=xyz",
      expiresInMinutes: 60,
    });
    expect(message.to).toBe("ada@example.com");
    expect(message.subject).toMatch(/reset/i);
    expect(message.bodyText).toContain("https://example.com/reset?token=xyz");
    expect(message.bodyText).toContain("60 minutes");
  });
});

describe("magicLinkEmail", () => {
  it("includes recipient, subject, URL, and short expiry window", () => {
    const message = magicLinkEmail({
      recipientEmail: "ada@example.com",
      signInUrl: "https://example.com/auth/magic-link?token=qrs",
      expiresInMinutes: 15,
    });
    expect(message.to).toBe("ada@example.com");
    expect(message.subject).toMatch(/sign-in/i);
    expect(message.bodyText).toContain("https://example.com/auth/magic-link?token=qrs");
    expect(message.bodyText).toContain("15 minutes");
    expect(message.bodyHtml).toContain("https://example.com/auth/magic-link?token=qrs");
  });
});
