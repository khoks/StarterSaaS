/**
 * TOTP 2FA enrollment flow (3 phases):
 *
 *   1. `startTotpEnrollment(deps, userId, issuer)` — generate a fresh secret
 *      and otpauth URL, store the secret tentatively on the user row but
 *      keep `totpEnabled = false`. User scans the URL in their authenticator
 *      app.
 *
 *   2. `confirmTotpEnrollment(deps, userId, code)` — user enters a 6-digit
 *      code from their authenticator. If it verifies against the stored
 *      secret, flip `totpEnabled = true` so subsequent sign-ins require TOTP.
 *
 *   3. `disableTotp(deps, userId, code)` — require a current 6-digit code
 *      (proves the user still controls the authenticator), then clear the
 *      secret and flip `totpEnabled = false`. Adopter UI typically also
 *      requires the user's password before exposing this — that's an HTTP-
 *      layer concern, not enforced here.
 */

import { eq } from "drizzle-orm";

import { users } from "../db/schema.js";
import type { AuthDeps, AuthResult } from "../types.js";

import { buildOtpAuthUrl, generateTotpSecret, verifyTotpCode } from "./totp.js";

export interface StartTotpEnrollmentResult {
  /** The Base32 secret. The adopter UI shows this to the user as a fallback
   *  if QR scanning fails. */
  secret: string;
  /** otpauth:// URL — adopter renders as a QR code in the enrollment UI. */
  otpAuthUrl: string;
}

export async function startTotpEnrollment(
  deps: AuthDeps,
  userId: string,
  issuer: string,
): Promise<AuthResult<StartTotpEnrollmentResult>> {
  if (typeof userId !== "string" || userId.length === 0) {
    return { ok: false, error: { kind: "validation-failed", issues: "userId required" } };
  }
  if (typeof issuer !== "string" || issuer.length === 0) {
    return { ok: false, error: { kind: "validation-failed", issues: "issuer required" } };
  }

  const found = await deps.db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = found[0];
  if (!user) {
    return { ok: false, error: { kind: "user-not-found" } };
  }

  const secret = generateTotpSecret();
  const otpAuthUrl = buildOtpAuthUrl({
    issuer,
    accountEmail: user.email,
    secret,
  });

  // Store the secret tentatively; totpEnabled stays false until confirm.
  await deps.db
    .update(users)
    .set({ totpSecret: secret, totpEnabled: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { ok: true, value: { secret, otpAuthUrl } };
}

export async function confirmTotpEnrollment(
  deps: AuthDeps,
  userId: string,
  code: string,
): Promise<AuthResult<{ enabledAt: Date }>> {
  const found = await deps.db
    .select({ id: users.id, totpSecret: users.totpSecret })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = found[0];
  if (!user) {
    return { ok: false, error: { kind: "user-not-found" } };
  }
  if (user.totpSecret === null) {
    // No enrollment in progress. Adopter should call startTotpEnrollment first.
    return { ok: false, error: { kind: "validation-failed", issues: "TOTP enrollment not started" } };
  }
  if (!verifyTotpCode(code, user.totpSecret)) {
    return { ok: false, error: { kind: "totp-invalid" } };
  }

  const enabledAt = new Date();
  await deps.db
    .update(users)
    .set({ totpEnabled: true, updatedAt: enabledAt })
    .where(eq(users.id, userId));

  return { ok: true, value: { enabledAt } };
}

export async function disableTotp(
  deps: AuthDeps,
  userId: string,
  code: string,
): Promise<AuthResult<{ disabledAt: Date }>> {
  const found = await deps.db
    .select({
      id: users.id,
      totpSecret: users.totpSecret,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = found[0];
  if (!user) {
    return { ok: false, error: { kind: "user-not-found" } };
  }
  if (!user.totpEnabled || user.totpSecret === null) {
    // Not enrolled — nothing to disable. Treat as success (idempotent).
    return { ok: true, value: { disabledAt: new Date() } };
  }
  if (!verifyTotpCode(code, user.totpSecret)) {
    return { ok: false, error: { kind: "totp-invalid" } };
  }

  const disabledAt = new Date();
  await deps.db
    .update(users)
    .set({ totpEnabled: false, totpSecret: null, updatedAt: disabledAt })
    .where(eq(users.id, userId));

  return { ok: true, value: { disabledAt } };
}
