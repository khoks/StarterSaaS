/**
 * Public types for the auth subsystem — dependency-injection contracts.
 *
 * The auth package is framework-agnostic; HTTP routes / RSC actions in the
 * adopter shell call these functions with their own DB connection + email
 * sender + config. This keeps the package testable in isolation and avoids
 * binding `packages/auth` to Fastify or Next or any specific transport.
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "./db/schema.js";

/**
 * Drizzle DB handle bound to our `platform` schema. Adopter constructs this
 * once at app boot and passes into every flow function.
 */
export type AuthDb = PostgresJsDatabase<typeof schema>;

/**
 * Email sender adapter. Default is `noopEmailSender` (no-op + console log)
 * so dev mode works without external deps. Adopter swaps in a real adapter
 * (SES / SendGrid / Resend / Postmark / etc.) in `starter.config.ts`.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export interface AuthConfig {
  /** Public base URL of the adopter app — used to build verification + reset links. */
  baseUrl: string;
  sessionLifetime: {
    /** Rolling session lifetime in days (per ADR-0007 default 30). */
    rollingDays: number;
    /** Idle timeout in days (per ADR-0007 default 7). */
    idleDays: number;
  };
  passwordPolicy: {
    /** Minimum length (per ADR-0007 default 12). */
    minLength: number;
    /** bcrypt cost factor (per ADR-0007 default 12). */
    bcryptCost: number;
    /** Optional HIBP k-anonymity check opt-in (per ADR-0007). */
    hibpCheck: boolean;
  };
  /** Email verification required for password sign-up; OAuth providers exempt. */
  requireEmailVerification: boolean;
  /** Failed-sign-in threshold before lockout (per ADR-0007 default 5). */
  accountLockoutThreshold: number;
  /** Lockout duration in minutes (per ADR-0007 default 15). */
  accountLockoutMinutes: number;
}

/**
 * Shared dependencies every flow function takes. Constructed once at boot,
 * threaded through HTTP routes / RSC actions.
 */
export interface AuthDeps {
  db: AuthDb;
  emailSender: EmailSender;
  config: AuthConfig;
}

/** Functional Result type for flow outcomes (per CLAUDE.md no-defensive-try/catch). */
export type AuthResult<T> = { ok: true; value: T } | { ok: false; error: AuthError };

/**
 * Closed union of auth error kinds — discriminated by `kind` for exhaustive
 * matching at HTTP-translation time. New error cases are additive across
 * future sub-PRs and follow-up Stories.
 */
export type AuthError =
  | { kind: "email-already-exists" }
  | { kind: "invalid-credentials" }
  | { kind: "email-not-verified" }
  | { kind: "totp-required" }
  | { kind: "totp-invalid" }
  | { kind: "account-locked"; unlockAt: Date }
  | { kind: "validation-failed"; issues: unknown }
  | { kind: "password-policy-violation"; reason: string }
  | { kind: "token-invalid-or-expired" }
  | { kind: "user-not-found" }
  | { kind: "session-not-found" }
  | { kind: "internal-error"; message: string };
