/**
 * @starter-saas/auth — Auth subsystem for StarterSaaS.
 *
 * Locked design: ../../docs/architecture/ADR-0007-auth-provider.md
 *
 * STORY-013 sub-PR scope:
 *  ✓ (#1) Drizzle schemas + Zod contracts + lint configs                    — PR #25
 *  ✓ (#2) Email + password flow (sign-up + sign-in + sign-out + verify +    — this PR
 *         password reset) + bcrypt + token helpers + email sender interface
 *    (#3) Magic link + OAuth (Google / GitHub / Apple) flows
 *    (#4) TOTP 2FA + audit-log writer + RBAC middleware
 */

export const PACKAGE_NAME = "@starter-saas/auth" as const;

// Schemas + Zod boundary contracts (sub-PR #1)
export * as schema from "./db/schema.js";
export * from "./contracts/index.js";

// Types + dependency-injection shapes
export type { AuthConfig, AuthDb, AuthDeps, AuthError, AuthResult, EmailMessage, EmailSender } from "./types.js";

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
export { passwordResetEmail, verificationEmail } from "./email/templates.js";

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

// Default config
export { defaultAuthConfig } from "./config/defaults.js";
