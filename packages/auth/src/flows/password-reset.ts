/**
 * Password reset flow — two phases:
 *
 *   `requestPasswordReset` — accepts an email, generates a 1-hour token,
 *     sends a reset email. Per ADR-0007, the response is INTENTIONALLY
 *     uniform whether or not the email exists (no enumeration leak).
 *
 *   `completePasswordReset` — accepts the token + new password, verifies
 *     the token is unexpired and one-time-use, hashes + writes the new
 *     password, deletes the token.
 *
 * Token TTL: 1 hour (per ADR-0007).
 */

import { and, eq } from "drizzle-orm";

import {
  PasswordResetCompleteSchema,
  PasswordResetRequestSchema,
} from "../contracts/user.js";
import { hashPassword } from "../crypto/password.js";
import { expiresInMinutes, generateToken, isStillValid } from "../crypto/tokens.js";
import { users, verificationTokens } from "../db/schema.js";
import { passwordResetEmail } from "../email/templates.js";
import type { AuthDeps, AuthResult } from "../types.js";

const RESET_TOKEN_TTL_MINUTES = 60;

/** Marker prefix inside the verification_tokens.identifier field for reset rows. */
const RESET_IDENTIFIER_PREFIX = "pwreset:";

export interface RequestResetResult {
  /**
   * Always true (we don't reveal whether the email was found). The caller can
   * always show "If an account exists for that email, you'll get a reset link."
   */
  acknowledged: true;
}

export async function requestPasswordReset(
  deps: AuthDeps,
  rawInput: unknown,
): Promise<AuthResult<RequestResetResult>> {
  const parsed = PasswordResetRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: { kind: "validation-failed", issues: parsed.error.issues } };
  }
  const input = parsed.data;

  const found = await deps.db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  const user = found[0];
  // Always return ok — even if user doesn't exist — to prevent enumeration.
  if (!user) {
    return { ok: true, value: { acknowledged: true } };
  }

  const token = generateToken();
  await deps.db.insert(verificationTokens).values({
    identifier: `${RESET_IDENTIFIER_PREFIX}${user.email}`,
    token,
    expires: expiresInMinutes(RESET_TOKEN_TTL_MINUTES),
  });

  const resetUrl = buildResetUrl(deps.config.baseUrl, token);
  await deps.emailSender.send(
    passwordResetEmail({
      recipientEmail: user.email,
      resetUrl,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    }),
  );

  return { ok: true, value: { acknowledged: true } };
}

export interface CompleteResetResult {
  email: string;
  resetAt: Date;
}

export async function completePasswordReset(
  deps: AuthDeps,
  rawInput: unknown,
): Promise<AuthResult<CompleteResetResult>> {
  const parsed = PasswordResetCompleteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: { kind: "validation-failed", issues: parsed.error.issues } };
  }
  const input = parsed.data;

  if (input.newPassword.length < deps.config.passwordPolicy.minLength) {
    return {
      ok: false,
      error: {
        kind: "password-policy-violation",
        reason: `Password must be at least ${deps.config.passwordPolicy.minLength} characters`,
      },
    };
  }

  const tokenRows = await deps.db
    .select({
      identifier: verificationTokens.identifier,
      token: verificationTokens.token,
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(eq(verificationTokens.token, input.token))
    .limit(1);

  const row = tokenRows[0];
  if (!row || !row.identifier.startsWith(RESET_IDENTIFIER_PREFIX) || !isStillValid(row.expires)) {
    return { ok: false, error: { kind: "token-invalid-or-expired" } };
  }

  const email = row.identifier.slice(RESET_IDENTIFIER_PREFIX.length);
  const passwordHash = await hashPassword(input.newPassword, deps.config.passwordPolicy.bcryptCost);
  const resetAt = new Date();

  await deps.db
    .update(users)
    .set({ passwordHash, updatedAt: resetAt })
    .where(eq(users.email, email));

  await deps.db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, row.token),
        eq(verificationTokens.identifier, row.identifier),
      ),
    );

  return { ok: true, value: { email, resetAt } };
}

function buildResetUrl(baseUrl: string, token: string): string {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmedBase}/auth/reset-password?token=${encodeURIComponent(token)}`;
}
