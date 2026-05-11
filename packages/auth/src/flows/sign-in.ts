/**
 * Sign-in flow — email + password.
 *
 * Steps:
 *   1. Validate input.
 *   2. Look up user by email; return "invalid-credentials" if not found
 *      (deliberately uniform with wrong-password to prevent email enumeration).
 *   3. Check lockout — if `users.lockedUntil` is in the future, return
 *      `account-locked` with the unlock timestamp.
 *   4. Verify password.
 *   5. On failure: increment `failedAttempts`; if it hits the configured
 *      threshold, set `lockedUntil` and emit `user.account_locked` audit.
 *   6. On success: reset `failedAttempts` to 0, clear `lockedUntil`.
 *   7. If user.totpEnabled: verify totpCode (now wired up in sub-PR #5).
 *   8. If config.requireEmailVerification && !user.emailVerified: refuse.
 *   9. Create session + audit `user.sign_in.success` / `failure`.
 */

import { eq } from "drizzle-orm";

import { writeAuditLog } from "../audit/writer.js";
import type { AuditContext } from "../audit/writer.js";
import { EMPTY_AUDIT_CONTEXT } from "../audit/writer.js";
import { SignInInputSchema } from "../contracts/user.js";
import { verifyPassword } from "../crypto/password.js";
import { expiresInDays, expiresInMinutes, generateToken, isStillValid } from "../crypto/tokens.js";
import { sessions, users } from "../db/schema.js";
import { verifyTotpCode } from "../totp/totp.js";
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
  auditContext: AuditContext = EMPTY_AUDIT_CONTEXT,
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
      totpSecret: users.totpSecret,
      failedAttempts: users.failedAttempts,
      lockedUntil: users.lockedUntil,
    })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  const user = found[0];
  if (!user || user.passwordHash === null) {
    await writeAuditLog(deps, {
      userId: null,
      tenantId: auditContext.tenantId,
      action: "user.sign_in.failure",
      details: { reason: "user-not-found-or-oauth-only", email: input.email },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });
    return { ok: false, error: { kind: "invalid-credentials" } };
  }

  // Account-lockout check (per ADR-0007 D-48).
  if (user.lockedUntil !== null && isStillValid(user.lockedUntil)) {
    return { ok: false, error: { kind: "account-locked", unlockAt: user.lockedUntil } };
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    await applyFailedAttempt(deps, user, auditContext);
    return { ok: false, error: { kind: "invalid-credentials" } };
  }

  // TOTP gate (per ADR-0007). Sub-PR #5 wires the actual verification.
  if (user.totpEnabled) {
    if (input.totpCode === undefined) {
      return { ok: false, error: { kind: "totp-required" } };
    }
    if (user.totpSecret === null || !verifyTotpCode(input.totpCode, user.totpSecret)) {
      await applyFailedAttempt(deps, user, auditContext);
      return { ok: false, error: { kind: "totp-invalid" } };
    }
  }

  if (deps.config.requireEmailVerification && user.emailVerified === null) {
    return { ok: false, error: { kind: "email-not-verified" } };
  }

  // Success path — clear failed attempts, create session.
  await deps.db
    .update(users)
    .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(users.id, user.id));

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
    details: { totp: user.totpEnabled },
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
  });

  return {
    ok: true,
    value: { sessionToken, expires, userId: user.id, email: user.email },
  };
}

interface LockoutCandidate {
  id: string;
  failedAttempts: number;
}

async function applyFailedAttempt(
  deps: AuthDeps,
  user: LockoutCandidate,
  auditContext: AuditContext,
): Promise<void> {
  const nextCount = user.failedAttempts + 1;
  const shouldLock = nextCount >= deps.config.accountLockoutThreshold;
  const lockedUntil = shouldLock
    ? expiresInMinutes(deps.config.accountLockoutMinutes)
    : null;

  await deps.db
    .update(users)
    .set({ failedAttempts: nextCount, lockedUntil, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await writeAuditLog(deps, {
    userId: user.id,
    tenantId: auditContext.tenantId,
    action: "user.sign_in.failure",
    details: { failedAttempts: nextCount, locked: shouldLock },
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
  });

  if (shouldLock) {
    await writeAuditLog(deps, {
      userId: user.id,
      tenantId: auditContext.tenantId,
      action: "user.account_locked",
      details: {
        threshold: deps.config.accountLockoutThreshold,
        lockoutMinutes: deps.config.accountLockoutMinutes,
        unlockAt: lockedUntil,
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });
  }
}
