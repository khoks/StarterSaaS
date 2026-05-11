/**
 * Magic link flow — passwordless sign-in via email.
 *
 * Two phases (parallel to password reset):
 *
 *   `requestMagicLink` — accepts an email, generates a 15-minute token,
 *     sends a sign-in email. Per ADR-0007, the response is INTENTIONALLY
 *     uniform whether or not the email exists (no enumeration leak).
 *     If the email doesn't match a user, NO email is sent — the response
 *     just looks identical to a successful request.
 *
 *   `verifyMagicLink` — accepts the token, verifies it's unexpired and
 *     one-time-use, creates a session (same shape as password sign-in),
 *     deletes the token, returns the session.
 *
 * Token TTL: 15 minutes (per ADR-0007 — magic links are intentionally
 * shorter-lived than password reset tokens because they grant immediate
 * sign-in rather than a password-change action).
 *
 * Token namespace: `verification_tokens.identifier` is prefixed with
 * `magic:` to distinguish from email-verification (no prefix) and
 * password-reset (`pwreset:`) tokens.
 */

import { and, eq } from "drizzle-orm";

import { MagicLinkRequestSchema } from "../contracts/user.js";
import { expiresInDays, expiresInMinutes, generateToken, isStillValid } from "../crypto/tokens.js";
import { sessions, users, verificationTokens } from "../db/schema.js";
import { magicLinkEmail } from "../email/templates.js";
import type { AuthDeps, AuthResult } from "../types.js";

const MAGIC_LINK_TTL_MINUTES = 15;

/** Marker prefix inside `verification_tokens.identifier` for magic-link rows. */
const MAGIC_LINK_IDENTIFIER_PREFIX = "magic:";

export interface RequestMagicLinkResult {
  /**
   * Always true (we don't reveal whether the email exists). The caller can
   * always show "If an account exists for that email, you'll get a sign-in
   * link." messaging.
   */
  acknowledged: true;
}

export async function requestMagicLink(
  deps: AuthDeps,
  rawInput: unknown,
): Promise<AuthResult<RequestMagicLinkResult>> {
  const parsed = MagicLinkRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: { kind: "validation-failed", issues: parsed.error.issues } };
  }
  const input = parsed.data;

  const found = await deps.db
    .select({ id: users.id, email: users.email, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  const user = found[0];
  // Uniform acknowledgement — no enumeration leak.
  if (!user) {
    return { ok: true, value: { acknowledged: true } };
  }

  const token = generateToken();
  await deps.db.insert(verificationTokens).values({
    identifier: `${MAGIC_LINK_IDENTIFIER_PREFIX}${user.email}`,
    token,
    expires: expiresInMinutes(MAGIC_LINK_TTL_MINUTES),
  });

  const signInUrl = buildSignInUrl(deps.config.baseUrl, token);
  await deps.emailSender.send(
    magicLinkEmail({
      recipientEmail: user.email,
      signInUrl,
      expiresInMinutes: MAGIC_LINK_TTL_MINUTES,
    }),
  );

  return { ok: true, value: { acknowledged: true } };
}

export interface VerifyMagicLinkResult {
  sessionToken: string;
  expires: Date;
  userId: string;
  email: string;
}

export async function verifyMagicLink(
  deps: AuthDeps,
  token: string,
): Promise<AuthResult<VerifyMagicLinkResult>> {
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, error: { kind: "token-invalid-or-expired" } };
  }

  const tokenRows = await deps.db
    .select({
      identifier: verificationTokens.identifier,
      token: verificationTokens.token,
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(eq(verificationTokens.token, token))
    .limit(1);

  const row = tokenRows[0];
  if (
    !row ||
    !row.identifier.startsWith(MAGIC_LINK_IDENTIFIER_PREFIX) ||
    !isStillValid(row.expires)
  ) {
    return { ok: false, error: { kind: "token-invalid-or-expired" } };
  }

  const email = row.identifier.slice(MAGIC_LINK_IDENTIFIER_PREFIX.length);

  const userRows = await deps.db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = userRows[0];
  if (!user) {
    // Race: user deleted between requestMagicLink and verifyMagicLink.
    // Treat as token-invalid (don't leak whether user existed).
    return { ok: false, error: { kind: "token-invalid-or-expired" } };
  }

  if (user.totpEnabled) {
    // TOTP verification ships in sub-PR #5; for now magic link does not
    // bypass TOTP — we refuse to issue a session for TOTP-enrolled users
    // until 2FA can be enforced.
    return { ok: false, error: { kind: "totp-required" } };
  }

  // Magic-link sign-in implicitly verifies the email — the user has demonstrated
  // control of the inbox. Mark emailVerified if not already.
  const verifiedAt = user.emailVerified ?? new Date();
  if (user.emailVerified === null) {
    await deps.db
      .update(users)
      .set({ emailVerified: verifiedAt, updatedAt: verifiedAt })
      .where(eq(users.id, user.id));
  }

  // Consume the token (one-time-use).
  await deps.db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, row.token),
        eq(verificationTokens.identifier, row.identifier),
      ),
    );

  // Create the session — same shape as password sign-in (per sub-PR #2).
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

function buildSignInUrl(baseUrl: string, token: string): string {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmedBase}/auth/magic-link?token=${encodeURIComponent(token)}`;
}
