/**
 * Sign-out flow — delete the session row by token + audit.
 *
 * Idempotent: signing out a non-existent session returns ok (silent no-op).
 * This matches the user expectation that "sign out" always succeeds.
 */

import { eq } from "drizzle-orm";

import { writeAuditLog } from "../audit/writer.js";
import type { AuditContext } from "../audit/writer.js";
import { EMPTY_AUDIT_CONTEXT } from "../audit/writer.js";
import { sessions } from "../db/schema.js";
import type { AuthDeps, AuthResult } from "../types.js";

export async function signOut(
  deps: AuthDeps,
  sessionToken: string,
  auditContext: AuditContext = EMPTY_AUDIT_CONTEXT,
): Promise<AuthResult<{ removed: boolean }>> {
  const deleted = await deps.db
    .delete(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .returning({ sessionToken: sessions.sessionToken, userId: sessions.userId });

  const removedRow = deleted[0];
  if (removedRow) {
    await writeAuditLog(deps, {
      userId: removedRow.userId,
      tenantId: auditContext.tenantId,
      action: "user.sign_out",
      details: {},
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });
  }

  return { ok: true, value: { removed: deleted.length > 0 } };
}
