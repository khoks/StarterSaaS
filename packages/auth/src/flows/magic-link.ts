/**
 * Magic link flow — passwordless sign-in via email.
 *
 * `requestMagicLink` — accepts an email, generates a 15-minute token, sends a
 * sign-in email. Uniform acknowledged response (no enumeration leak).
 *
 * `verifyMagicLink` — accepts the token, verifies it's unexpired + correctly
 * namespaced + the user still exists + TOTP not required, creates a session
 * matching sub-PR #2's shape, deletes the token, returns the session payload.
 */

import { and, eq } from "drizzle-orm";

import { writeAuditLog } from "../audit/writer.js";
import type { AuditContext } from "../audit/writer.js";
import { EMPTY_AUDIT_CONTEXT } from "../audit/writer.js";
import { MagicLinkRequestSchema } from "../contracts/user.js";
import { expiresInDays, expiresInMinutes, generateToken, isStillValid } from "../crypto/tokens.js";
import { sessions, users, verificationTokens } from "../db/schema.js";
import { magicLinkEmail } from "../email/templates.js";
import { verifyTotpCode } from "../totp/totp.js";
import type { AuthDeps, AuthResult } from "../types.js";

const MAGIC_LINK_TTL_MINUTES = 15;
const MAGIC_LINK_IDENTIFIER_PREFIX = "magic:";

export interface RequestMagicLinkResult {
  acknowledged: true;
}

export async function requestMagicLink(
  deps: AuthDeps,
  rawInput: unknown,
  auditContext: AuditContext = EMPTY_AUDIT_CONTEXT,
): Promise<AuthResult<RequestMagicLinkResult>> {
  const parsed = MagicLinkRequestSchema.safeParse(rawInput);
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

  // Pre-success audit — token issued. The actual sign-in event is logged
  // in verifyMagicLink. We don't audit the user.id here for the (rare) race
  // where the user deletes the account before clicking the link; the audit
  // log entry's value is mostly about the issued-token signal.
  await writeAuditLog(deps, {
    userId: user.id,
    tenantId: auditContext.tenantId,
    action: "user.password_reset_requested",
    details: { flow: "magic_link" },
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
  });

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
  auditContext: AuditContext = EMPTY_AUDIT_CONTEXT,
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
      totpSecret: users.totpSecret,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = userRows[0];
  if (!user) {
    return { ok: false, error: { kind: "token-invalid-or-expired" } };
  }

  if (user.totpEnabled) {
    // Magic-link does NOT bypass TOTP. Adopter UI prompts for a TOTP code
    // after the magic link arrives if user has 2FA enrolled. For MVP-1 we
    // accept the totp code via a second call (verifyMagicLinkWithTotp not
    // shipped yet — when added in a follow-up, this branch is the surface).
    return { ok: false, error: { kind: "totp-required" } };
  }

  // Implicitly verify email — user demonstrated control of the inbox.
  const verifiedAt = user.emailVerified ?? new Date();
  if (user.emailVerified === null) {
    await deps.db
      .update(users)
      .set({ emailVerified: verifiedAt, updatedAt: verifiedAt })
      .where(eq(users.id, user.id));
  }

  await deps.db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, row.token),
        eq(verificationTokens.identifier, row.identifier),
      ),
    );

  const sessionToken = generateToken();
  const expires = expiresInDays(deps.config.sessionLifetime.rollingDays);
  await deps.db.insert(sessions).values({
    sessionToken,
    userId: user.id,
    expires,
  });

  await writeAuditLog(deps, {
    userId: user.id,
    tenantId: auditContext.tenantId,
    action: "user.sign_in.success",
    details: { method: "magic_link" },
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
  });

  // Suppress unused-var lint for verifyTotpCode (imported for forward compat;
  // verifyMagicLinkWithTotp follow-up uses it).
  void verifyTotpCode;

  return {
    ok: true,
    value: { sessionToken, expires, userId: user.id, email: user.email },
  };
}

function buildSignInUrl(baseUrl: string, token: string): string {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmedBase}/auth/magic-link?token=${encodeURIComponent(token)}`;
}
