/**
 * Unit tests for password hashing utilities.
 *
 * Uses bcrypt cost 4 (NOT the production default 12) to keep tests fast.
 * Production code paths use the configurable `AuthConfig.passwordPolicy.bcryptCost`.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_BCRYPT_COST, hashPassword, verifyPassword } from "../../src/crypto/password.js";

const TEST_COST = 4;

describe("hashPassword + verifyPassword", () => {
  it("hashes a password and verifies the same plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple", TEST_COST);
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects an incorrect plaintext", async () => {
    const hash = await hashPassword("the right one", TEST_COST);
    expect(await verifyPassword("the wrong one", hash)).toBe(false);
  });

  it("produces different hashes for the same input (random salt)", async () => {
    const a = await hashPassword("same input", TEST_COST);
    const b = await hashPassword("same input", TEST_COST);
    expect(a).not.toBe(b);
    expect(await verifyPassword("same input", a)).toBe(true);
    expect(await verifyPassword("same input", b)).toBe(true);
  });

  it("uses the configured cost factor (encoded in the hash)", async () => {
    const hash = await hashPassword("test", 4);
    expect(hash.split("$")[2]).toBe("04");
  });

  it("default cost is 12 per ADR-0007", () => {
    expect(DEFAULT_BCRYPT_COST).toBe(12);
  });
});
