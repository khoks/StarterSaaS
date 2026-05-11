/**
 * TOTP primitives — secret generation + otpauth URL + verify roundtrip.
 *
 * Uses otplib's `authenticator.generate(secret)` to produce a current-step
 * code for the verify path so we can assert true.
 */

import { authenticator } from "otplib";
import { describe, expect, it } from "vitest";

import { buildOtpAuthUrl, generateTotpSecret, verifyTotpCode } from "../../src/totp/totp.js";

describe("generateTotpSecret", () => {
  it("returns a Base32 string of sensible length", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it("returns different secrets on each call", () => {
    expect(generateTotpSecret()).not.toBe(generateTotpSecret());
  });
});

describe("buildOtpAuthUrl", () => {
  it("returns an otpauth:// URL with issuer + account + secret encoded", () => {
    const url = buildOtpAuthUrl({
      issuer: "StarterSaaS",
      accountEmail: "ada@example.com",
      secret: "JBSWY3DPEHPK3PXP",
    });
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain("StarterSaaS");
    // `@` is URL-encoded as `%40` per RFC 3986. Decode before assertion.
    expect(decodeURIComponent(url)).toContain("ada@example.com");
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
  });
});

describe("verifyTotpCode", () => {
  it("accepts a freshly-generated code from the same secret", () => {
    const secret = generateTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotpCode(code, secret)).toBe(true);
  });

  it("rejects a code from a different secret", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    const codeFromB = authenticator.generate(b);
    expect(verifyTotpCode(codeFromB, a)).toBe(false);
  });

  it("rejects malformed code (not 6 digits)", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode("abc123", secret)).toBe(false);
    expect(verifyTotpCode("12345", secret)).toBe(false);
    expect(verifyTotpCode("1234567", secret)).toBe(false);
    expect(verifyTotpCode("", secret)).toBe(false);
  });

  it("rejects non-string input", () => {
    const secret = generateTotpSecret();
    // @ts-expect-error — runtime guard against non-string input
    expect(verifyTotpCode(undefined, secret)).toBe(false);
    // @ts-expect-error
    expect(verifyTotpCode(null, secret)).toBe(false);
    // @ts-expect-error
    expect(verifyTotpCode(123456, secret)).toBe(false);
  });
});
