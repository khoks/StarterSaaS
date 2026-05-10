/**
 * Sign-out flow — delete the session row by token.
 *
 * Idempotent: signing out a non-existent session returns ok (silent no-op).
 * This matches the user expectation that "sign out" always succeeds.
 */

import { eq } from "drizzle-orm";

import { sessions } from "../db/schema.js";
import type { AuthDeps, AuthResult } from "../types.js";

export async function signOut(
  deps: AuthDeps,
  sessionToken: string,
): Promise<AuthResult<{ removed: boolean }>> {
  const deleted = await deps.db
    .delete(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .returning({ sessionToken: sessions.sessionToken });

  return { ok: true, value: { removed: deleted.length > 0 } };
}
