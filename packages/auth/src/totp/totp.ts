/**
 * TOTP 2FA primitives — RFC 6238 time-based one-time password support.
 *
 * Wraps `otplib`'s authenticator module for secret generation + code
 * verification. Authenticator app (Google Authenticator / 1Password / Authy /
 * Bitwarden) scans the otpauth:// URL we emit and computes 6-digit codes
 * every 30 seconds.
 *
 * Defaults match the RFC 6238 baseline + Google Authenticator conventions:
 *   - 6-digit codes
 *   - 30-second period
 *   - SHA-1 (still the practical default; SHA-256/512 cause compat issues
 *     with some authenticator apps)
 *   - ±1 step window (allow 30s clock skew either direction)
 */

import { authenticator } from "otplib";

// Match Google Authenticator conventions; SHA-1 / 6-digit / 30s period is the practical default.
authenticator.options = {
  step: 30,
  digits: 6,
  window: 1,
};

/** Generate a fresh Base32 TOTP secret. ~20 bytes of entropy. */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Build the otpauth:// URL the authenticator app scans (via QR code or paste).
 * Issuer is the kit's product name (adopter-configurable); account is the
 * user's email so they can distinguish accounts in the authenticator UI.
 */
export function buildOtpAuthUrl(args: {
  issuer: string;
  accountEmail: string;
  secret: string;
}): string {
  return authenticator.keyuri(args.accountEmail, args.issuer, args.secret);
}

/**
 * Verify a 6-digit code against the stored secret. Returns true if the code
 * matches the current step or one step on either side (per `window: 1`).
 *
 * Constant-time comparison happens inside otplib; safe to use directly.
 */
export function verifyTotpCode(code: string, secret: string): boolean {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return false;
  }
  return authenticator.verify({ token: code, secret });
}
