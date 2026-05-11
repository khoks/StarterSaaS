/**
 * Email verification flow — consume a one-time verification token and mark
 * the user's `emailVerified` timestamp.
 */

import { and, eq } from "drizzle-orm";

import { writeAuditLog } from "../audit/writer.js";
import type { AuditContext } from "../audit/writer.js";
import { EMPTY_AUDIT_CONTEXT } from "../audit/writer.js";
import { isStillValid } from "../crypto/tokens.js";
import { users, verificationTokens } from "../db/schema.js";
import type { AuthDeps, AuthResult } from "../types.js";

export interface VerifyEmailResult {
  email: string;
  verifiedAt: Date;
}

/** Reject any token whose identifier carries a non-default prefix (those belong
 *  to password-reset / magic-link flows and must NOT be consumed here). */
const NON_VERIFICATION_PREFIXES = ["pwreset:", "magic:"] as const;

export async function verifyEmail(
  deps: AuthDeps,
  token: string,
  auditContext: AuditContext = EMPTY_AUDIT_CONTEXT,
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
  if (
    !row ||
    NON_VERIFICATION_PREFIXES.some((p) => row.identifier.startsWith(p)) ||
    !isStillValid(row.expires)
  ) {
    return { ok: false, error: { kind: "token-invalid-or-expired" } };
  }

  const verifiedAt = new Date();

  const updated = await deps.db
    .update(users)
    .set({ emailVerified: verifiedAt, updatedAt: verifiedAt })
    .where(eq(users.email, row.identifier))
    .returning({ id: users.id });

  await deps.db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, row.token),
        eq(verificationTokens.identifier, row.identifier),
      ),
    );

  await writeAuditLog(deps, {
    userId: updated[0]?.id ?? null,
    tenantId: auditContext.tenantId,
    action: "user.email_verified",
    details: { email: row.identifier },
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
  });

  return { ok: true, value: { email: row.identifier, verifiedAt } };
}
