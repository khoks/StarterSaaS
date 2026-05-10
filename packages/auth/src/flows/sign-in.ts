/**
 * Sign-in flow — email + password.
 *
 * Steps:
 *   1. Validate input.
 *   2. Look up user by email; return "invalid-credentials" if not found
 *      (deliberately uniform with wrong-password to prevent email enumeration).
 *   3. Verify password against stored bcrypt hash.
 *   4. If user.totpEnabled: return "totp-required" — TOTP verification flow
 *      lands in sub-PR #4. For now, TOTP-enrolled users cannot sign in via
 *      email+pwd alone.
 *   5. If config.requireEmailVerification && !user.emailVerified: return
 *      "email-not-verified".
 *   6. Generate session token + insert `platform.sessions` row.
 *   7. Return session token + user info.
 *
 * Account lockout (failed attempt counting) is NOT in this PR — lands in
 * sub-PR #4 with audit-log writer + RBAC middleware.
 */

import { eq } from "drizzle-orm";

import { SignInInputSchema } from "../contracts/user.js";
import { verifyPassword } from "../crypto/password.js";
import { generateToken, expiresInDays } from "../crypto/tokens.js";
import { sessions, users } from "../db/schema.js";
import type { AuthDeps, AuthResult } from "../types.js";

export interface SignInResult {
  sessionToken: string;
  expires: Date;
  userId: string;
  email: string;
}

export async function signIn(
  deps: AuthDeps,
  rawInput: unknown,
): Promise<AuthResult<SignInResult>> {
  const parsed = SignInInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: { kind: "validation-failed", issues: parsed.error.issues } };
  }
  const input = parsed.data;

  const found = await deps.db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      emailVerified: users.emailVerified,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  const user = found[0];
  if (!user || user.passwordHash === null) {
    // Uniform message: don't leak whether the email exists.
    return { ok: false, error: { kind: "invalid-credentials" } };
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    return { ok: false, error: { kind: "invalid-credentials" } };
  }

  if (user.totpEnabled) {
    // TOTP verification ships in sub-PR #4; for now we refuse the sign-in so
    // we never accidentally let a TOTP-enrolled user in without 2FA.
    return { ok: false, error: { kind: "totp-required" } };
  }

  if (deps.config.requireEmailVerification && user.emailVerified === null) {
    return { ok: false, error: { kind: "email-not-verified" } };
  }

  const sessionToken = generateToken();
  const expires = expiresInDays(deps.config.sessionLifetime.rollingDays);

  await deps.db.insert(sessions).values({
    sessionToken,
    userId: user.id,
    expires,
  });

  return {
    ok: true,
    value: { sessionToken, expires, userId: user.id, email: user.email },
  };
}
