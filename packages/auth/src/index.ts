/**
 * @starter-saas/auth — Auth subsystem for StarterSaaS.
 *
 * Locked design: ../../docs/architecture/ADR-0007-auth-provider.md
 *
 * STORY-013 sub-PR scope:
 *  ✓ (#1) Drizzle schemas + Zod contracts + lint configs                    — PR #25
 *  ✓ (#2) Email + password flow (sign-up + sign-in + sign-out + verify +    — PR #27
 *         password reset) + bcrypt + token helpers + email sender interface
 *  ✓ (#3) Magic-link flow                                                    — PR #28
 *    (#4) OAuth (Google / GitHub / Apple) via @auth/core — deferred
 *  ✓ (#5) TOTP 2FA + audit-log writer + account lockout + RBAC helpers     — this PR
 */

export const PACKAGE_NAME = "@starter-saas/auth" as const;

// Schemas + Zod boundary contracts (sub-PR #1)
export * as schema from "./db/schema.js";
export * from "./contracts/index.js";

// Types + dependency-injection shapes
export type {
  AuthConfig,
  AuthDb,
  AuthDeps,
  AuthError,
  AuthResult,
  EmailMessage,
  EmailSender,
} from "./types.js";

// Crypto utilities
export { DEFAULT_BCRYPT_COST, hashPassword, verifyPassword } from "./crypto/password.js";
export {
  expiresInDays,
  expiresInHours,
  expiresInMinutes,
  generateToken,
  isStillValid,
} from "./crypto/tokens.js";

// Email-sender defaults
export { noopEmailSender } from "./email/email-sender.js";
export {
  magicLinkEmail,
  passwordResetEmail,
  verificationEmail,
} from "./email/templates.js";

// Flow functions — pure, dependency-injected
export { signUp } from "./flows/sign-up.js";
export type { SignUpResult } from "./flows/sign-up.js";

export { signIn } from "./flows/sign-in.js";
export type { SignInResult } from "./flows/sign-in.js";

export { signOut } from "./flows/sign-out.js";

export { verifyEmail } from "./flows/verify-email.js";
export type { VerifyEmailResult } from "./flows/verify-email.js";

export {
  completePasswordReset,
  requestPasswordReset,
} from "./flows/password-reset.js";
export type {
  CompleteResetResult,
  RequestResetResult,
} from "./flows/password-reset.js";

export {
  requestMagicLink,
  verifyMagicLink,
} from "./flows/magic-link.js";
export type {
  RequestMagicLinkResult,
  VerifyMagicLinkResult,
} from "./flows/magic-link.js";

// Audit log writer (sub-PR #5)
export { writeAuditLog, EMPTY_AUDIT_CONTEXT } from "./audit/writer.js";
export type { AuditContext } from "./audit/writer.js";

// TOTP 2FA (sub-PR #5)
export { buildOtpAuthUrl, generateTotpSecret, verifyTotpCode } from "./totp/totp.js";
export {
  confirmTotpEnrollment,
  disableTotp,
  startTotpEnrollment,
} from "./totp/enrollment.js";
export type { StartTotpEnrollmentResult } from "./totp/enrollment.js";

// RBAC helpers (sub-PR #5)
export {
  DEFAULT_TENANT_ROLES,
  PLATFORM_ADMIN_ROLE,
  hasAnyRole,
  isPlatformAdmin,
} from "./rbac/checks.js";
export type { DefaultTenantRole, RoleCheckResult } from "./rbac/checks.js";

// Default config
export { defaultAuthConfig } from "./config/defaults.js";
