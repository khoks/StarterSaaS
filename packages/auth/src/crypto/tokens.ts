/**
 * Random token generation for sessions + verification + password reset + invites.
 *
 * Uses Node's `crypto.randomBytes` (CSPRNG). 32 bytes = 256 bits entropy,
 * URL-safe base64 encoded (43 chars). Tokens are opaque to callers; only
 * the server-side row lookup gives them meaning.
 */

import { randomBytes } from "node:crypto";

/** 32 bytes = 256 bits of entropy. Sufficient for opaque session / verification tokens. */
const DEFAULT_TOKEN_BYTES = 32;

/**
 * Generate a URL-safe random token. Used for session tokens, email verification
 * tokens, password reset tokens, and tenant-invite tokens.
 */
export function generateToken(bytes: number = DEFAULT_TOKEN_BYTES): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Token expiry helpers — return absolute timestamps for DB writes.
 * Inputs are in convenient units; outputs are `Date` for direct insertion.
 */
export function expiresInMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function expiresInHours(hours: number): Date {
  return expiresInMinutes(hours * 60);
}

export function expiresInDays(days: number): Date {
  return expiresInHours(days * 24);
}

/** Check whether a stored expiry timestamp is still in the future. */
export function isStillValid(expires: Date, now: Date = new Date()): boolean {
  return expires.getTime() > now.getTime();
}
