/**
 * Sign-up flow — email + password.
 *
 * Steps:
 *   1. Validate input against SignUpInputSchema (D-25 boundary).
 *   2. Reject if email already in `platform.users`.
 *   3. Hash password (bcrypt, configurable cost).
 *   4. Insert user row.
 *   5. Generate verification token, insert into `platform.verification_tokens`.
 *   6. Send verification email via `EmailSender`.
 *   7. Return the new user's id + signal that email verification is pending.
 *
 * NB: this flow does NOT create a session — sign-up returns "verify your email
 * then sign in" by default per ADR-0007 (require_email_verification = true).
 * Adopters who want auto-sign-in after sign-up can call `signIn` immediately
 * (with `requireEmailVerification: false` in their config).
 */

import { eq } from "drizzle-orm";

import { SignUpInputSchema } from "../contracts/user.js";
import { hashPassword } from "../crypto/password.js";
import { generateToken, expiresInHours } from "../crypto/tokens.js";
import { users, verificationTokens } from "../db/schema.js";
import { verificationEmail } from "../email/templates.js";
import type { AuthDeps, AuthResult } from "../types.js";

export interface SignUpResult {
  userId: string;
  email: string;
  emailVerificationPending: boolean;
}

const VERIFICATION_TOKEN_TTL_HOURS = 24;

export async function signUp(
  deps: AuthDeps,
  rawInput: unknown,
): Promise<AuthResult<SignUpResult>> {
  const parsed = SignUpInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: { kind: "validation-failed", issues: parsed.error.issues } };
  }
  const input = parsed.data;

  if (input.password.length < deps.config.passwordPolicy.minLength) {
    return {
      ok: false,
      error: {
        kind: "password-policy-violation",
        reason: `Password must be at least ${deps.config.passwordPolicy.minLength} characters`,
      },
    };
  }

  const existing = await deps.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    return { ok: false, error: { kind: "email-already-exists" } };
  }

  const passwordHash = await hashPassword(input.password, deps.config.passwordPolicy.bcryptCost);

  const inserted = await deps.db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      passwordHash,
    })
    .returning({ id: users.id, email: users.email });

  const newUser = inserted[0];
  if (!newUser) {
    return {
      ok: false,
      error: { kind: "internal-error", message: "Failed to insert new user row" },
    };
  }

  const verificationToken = generateToken();
  await deps.db.insert(verificationTokens).values({
    identifier: newUser.email,
    token: verificationToken,
    expires: expiresInHours(VERIFICATION_TOKEN_TTL_HOURS),
  });

  const verificationUrl = buildVerificationUrl(deps.config.baseUrl, verificationToken);
  await deps.emailSender.send(
    verificationEmail({
      recipientEmail: newUser.email,
      verificationUrl,
      expiresInHours: VERIFICATION_TOKEN_TTL_HOURS,
    }),
  );

  return {
    ok: true,
    value: {
      userId: newUser.id,
      email: newUser.email,
      emailVerificationPending: deps.config.requireEmailVerification,
    },
  };
}

function buildVerificationUrl(baseUrl: string, token: string): string {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmedBase}/auth/verify-email?token=${encodeURIComponent(token)}`;
}
