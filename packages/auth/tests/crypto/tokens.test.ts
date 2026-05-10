/**
 * Unit tests for token generation + expiry helpers.
 */

import { describe, expect, it } from "vitest";

import {
  expiresInDays,
  expiresInHours,
  expiresInMinutes,
  generateToken,
  isStillValid,
} from "../../src/crypto/tokens.js";

describe("generateToken", () => {
  it("returns a URL-safe base64 string (43 chars by default for 32 bytes)", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token.length).toBeLessThanOrEqual(50);
  });

  it("returns different tokens on each call", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });

  it("respects custom byte count", () => {
    const short = generateToken(16);
    const long = generateToken(64);
    expect(short.length).toBeLessThan(long.length);
  });
});

describe("expiry helpers", () => {
  it("expiresInMinutes returns a Date `n` minutes in the future", () => {
    const before = Date.now();
    const expiry = expiresInMinutes(15);
    const after = Date.now();
    const expected = before + 15 * 60 * 1000;
    expect(expiry.getTime()).toBeGreaterThanOrEqual(expected);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + 15 * 60 * 1000);
  });

  it("expiresInHours compounds via minutes", () => {
    const oneHour = expiresInHours(1).getTime();
    const sixtyMinutes = expiresInMinutes(60).getTime();
    expect(Math.abs(oneHour - sixtyMinutes)).toBeLessThan(50);
  });

  it("expiresInDays compounds via hours", () => {
    const oneDay = expiresInDays(1).getTime();
    const twentyFourHours = expiresInHours(24).getTime();
    expect(Math.abs(oneDay - twentyFourHours)).toBeLessThan(50);
  });
});

describe("isStillValid", () => {
  it("returns true for a future timestamp", () => {
    expect(isStillValid(new Date(Date.now() + 1000))).toBe(true);
  });

  it("returns false for a past timestamp", () => {
    expect(isStillValid(new Date(Date.now() - 1000))).toBe(false);
  });

  it("uses an explicit `now` if provided", () => {
    const past = new Date("2026-01-01T00:00:00Z");
    const future = new Date("2026-12-31T00:00:00Z");
    expect(isStillValid(future, past)).toBe(true);
    expect(isStillValid(past, future)).toBe(false);
  });
});
