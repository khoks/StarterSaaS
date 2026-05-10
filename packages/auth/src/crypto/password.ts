/**
 * Password hashing utilities — bcrypt cost 12 default per ADR-0007.
 *
 * The HIBP k-anonymity breach check is opt-in via `AuthConfig.passwordPolicy.hibpCheck`;
 * impl lands when the first adopter requests it (deferred from MVP-1 sub-PR #2).
 */

import { compare, hash as bcryptHash } from "bcryptjs";

/** Default cost per ADR-0007 / D-48. Adopter overrides via `AuthConfig`. */
export const DEFAULT_BCRYPT_COST = 12;

/**
 * Hash a plaintext password. Cost is configurable via `AuthConfig.passwordPolicy.bcryptCost`.
 * Returns the full bcrypt hash including salt + cost prefix.
 */
export async function hashPassword(plaintext: string, cost = DEFAULT_BCRYPT_COST): Promise<string> {
  return bcryptHash(plaintext, cost);
}

/**
 * Verify a plaintext password against a stored bcrypt hash. Constant-time
 * comparison via bcryptjs internals.
 */
export async function verifyPassword(plaintext: string, storedHash: string): Promise<boolean> {
  return compare(plaintext, storedHash);
}
