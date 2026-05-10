/**
 * Audit log entry contracts — Zod-validated boundary types (per D-25).
 *
 * Audit log writer publishes to `platform.audit_log` (via DB write) AND emits
 * an event to the event bus (per D-45) so observability consumers can roll up
 * security signals (failed-sign-in spikes, etc.) in EPIC-005 dashboards.
 */

import { z } from "zod";

/**
 * String-literal union (per D-25: no enums). Add new actions here as features
 * land; consumers can pattern-match exhaustively.
 */
export const AuditActionSchema = z.enum([
  "user.sign_in.success",
  "user.sign_in.failure",
  "user.sign_out",
  "user.sign_up",
  "user.email_verified",
  "user.password_changed",
  "user.password_reset_requested",
  "user.password_reset_completed",
  "user.totp_enrolled",
  "user.totp_disabled",
  "user.account_locked",
  "user.account_unlocked",
  "user_tenant.role_changed",
  "user_tenant.invited",
  "user_tenant.invite_accepted",
  "user_tenant.removed",
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditDetailsSchema = z.record(z.unknown());

/** What the audit-log writer accepts as input. */
export const AuditEntryInputSchema = z.object({
  userId: z.string().uuid().nullable(),
  tenantId: z.string().uuid().nullable(),
  action: AuditActionSchema,
  details: AuditDetailsSchema.default({}),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});

export type AuditEntryInput = z.infer<typeof AuditEntryInputSchema>;
