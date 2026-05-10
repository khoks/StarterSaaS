/**
 * Email verification flow — consume a one-time verification token and mark
 * the user's `emailVerified` timestamp.
 *
 * Steps:
 *   1. Look up the verification_tokens row by token.
 *   2. Reject if not found OR expired.
 *   3. Update user.emailVerified = now() for the row whose email matches
 *      the token's `identifier`.
 *   4. Delete the verification_tokens row (one-time-use).
 */

import { and, eq } from "drizzle-orm";

import { isStillValid } from "../crypto/tokens.js";
import { users, verificationTokens } from "../db/schema.js";
import type { AuthDeps, AuthResult } from "../types.js";

export interface VerifyEmailResult {
  email: string;
  verifiedAt: Date;
}

export async function verifyEmail(
  deps: AuthDeps,
  token: string,
): Promise<AuthResult<VerifyEmailResult>> {
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, error: { kind: "token-invalid-or-expired" } };
  }

  const found = await deps.db
    .select({
      identifier: verificationTokens.identifier,
      token: verificationTokens.token,
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(eq(verificationTokens.token, token))
    .limit(1);

  const row = found[0];
  if (!row || !isStillValid(row.expires)) {
    return { ok: false, error: { kind: "token-invalid-or-expired" } };
  }

  const verifiedAt = new Date();

  await deps.db
    .update(users)
    .set({ emailVerified: verifiedAt, updatedAt: verifiedAt })
    .where(eq(users.email, row.identifier));

  await deps.db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, row.token),
        eq(verificationTokens.identifier, row.identifier),
      ),
    );

  return { ok: true, value: { email: row.identifier, verifiedAt } };
}
