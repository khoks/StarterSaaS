/**
 * PII scrubbing helpers — `hashRecipient` (for audit events) +
 * `maskRecipient` (for human-readable CLI output).
 */

import { describe, expect, it } from "vitest";

import { hashRecipient, maskRecipient } from "../src/index.js";

describe("hashRecipient", () => {
  it("produces a 16-char hex digest", () => {
    const hash = hashRecipient("user@example.com");
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("normalizes casing + whitespace", () => {
    expect(hashRecipient("User@Example.COM")).toBe(hashRecipient("user@example.com"));
    expect(hashRecipient("  user@example.com  ")).toBe(hashRecipient("user@example.com"));
  });

  it("different emails produce different hashes", () => {
    expect(hashRecipient("a@x.com")).not.toBe(hashRecipient("b@x.com"));
  });
});

describe("maskRecipient", () => {
  it("keeps first character of local part + domain visible", () => {
    expect(maskRecipient("alice@acme.test")).toBe("a****@acme.test");
  });
  it("handles single-char local parts", () => {
    expect(maskRecipient("a@x.com")).toBe("a*@x.com");
  });
  it("returns *** for malformed addresses", () => {
    expect(maskRecipient("no-at-sign")).toBe("***");
    expect(maskRecipient("@only-domain")).toBe("***");
  });
});
