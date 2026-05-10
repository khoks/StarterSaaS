/**
 * Drizzle ORM schemas for the auth subsystem (per ADR-0007).
 *
 * All tables live in the `platform` schema (per D-33 / D-44 multi-tenancy model).
 * Per-tenant RBAC tables (`tenant_xyz.roles`, `tenant_xyz.user_roles`) are
 * defined in `@starter-saas/tenancy` (STORY-014) — this package only owns the
 * cross-tenant identity surface.
 */

import { pgSchema, text, uuid, timestamp, integer, boolean, jsonb, primaryKey } from "drizzle-orm/pg-core";

/** All auth tables live under the `platform` Postgres schema. */
export const platform = pgSchema("platform");

/**
 * `platform.users` — global user identity. A user can belong to multiple
 * tenants via `platform.user_tenant`.
 */
export const users = platform.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  name: text("name"),
  image: text("image"),
  /** bcrypt hash (cost 12 per ADR-0007); null for OAuth-only users. */
  passwordHash: text("password_hash"),
  /** TOTP secret for 2FA; null until user enrolls. */
  totpSecret: text("totp_secret"),
  /** When 2FA is required by tenant policy or user opt-in. */
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/**
 * `platform.accounts` — OAuth account linkage (Auth.js Drizzle adapter shape).
 * One row per (provider, providerAccountId).
 */
export const accounts = platform.table(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

/**
 * `platform.sessions` — DB-backed sessions (default per ADR-0007).
 * JWT mode is opt-in; in that case sessions are not persisted here.
 */
export const sessions = platform.table("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  /** Active tenant for this session; null for users who haven't picked yet. */
  activeTenantId: uuid("active_tenant_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/**
 * `platform.verification_tokens` — email verification + magic link + password
 * reset tokens. One-time-use; expires per ADR-0007 (default 1 hour for reset).
 */
export const verificationTokens = platform.table(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

/**
 * `platform.user_tenant` — many-to-many: user ↔ tenant memberships.
 * A user can belong to multiple tenants (agency reps, multi-product founders).
 * `roleId` references `tenant_xyz.roles` — RBAC lookup happens in tenant context
 * once `activeTenantId` is set in the session.
 */
export const userTenant = platform.table(
  "user_tenant",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull(),
    /** Free-text role label; full RBAC lookup is per-tenant (STORY-014). */
    roleLabel: text("role_label").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (ut) => ({
    compoundKey: primaryKey({ columns: [ut.userId, ut.tenantId] }),
  }),
);

/**
 * `platform.user_tenant_invites` — pending tenant invites. Token-based; 7-day
 * expiry default per ADR-0007.
 */
export const userTenantInvites = platform.table("user_tenant_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  roleLabel: text("role_label").notNull().default("member"),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/**
 * `platform.audit_log` — auth + RBAC events (sign-in / sign-out / password
 * change / role change / etc.). Per ADR-0007. Cross-tenant writer; tenant
 * context optional (some events are pre-tenant-selection).
 */
export const auditLog = platform.table("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  tenantId: uuid("tenant_id"),
  action: text("action").notNull(),
  details: jsonb("details").notNull().default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/** Public type exports for downstream packages. */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type UserTenant = typeof userTenant.$inferSelect;
export type UserTenantInvite = typeof userTenantInvites.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
