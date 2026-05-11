/**
 * Audit log writer — single entry point for security/identity events.
 *
 * Every flow (sign-up / sign-in / sign-out / verify-email / password reset /
 * magic link / TOTP / role change) calls `writeAuditLog` after the primary
 * action completes. Failures are non-fatal — the writer logs to console on
 * insert error and returns ok rather than failing the surrounding flow,
 * because losing an audit row should never block the user's primary action.
 *
 * Event-bus emission lands in EPIC-005 (observability) when the bus exists.
 * For now this is DB-only.
 */

import { auditLog } from "../db/schema.js";
import type { AuditEntryInput } from "../contracts/audit.js";
import { AuditEntryInputSchema } from "../contracts/audit.js";
import type { AuthDeps } from "../types.js";

export async function writeAuditLog(deps: AuthDeps, entry: AuditEntryInput): Promise<void> {
  const parsed = AuditEntryInputSchema.safeParse(entry);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.warn(
      `[auth:audit] dropped invalid audit entry action=${String(entry.action)}: ${parsed.error.message}`,
    );
    return;
  }
  const validated = parsed.data;

  try {
    await deps.db.insert(auditLog).values({
      userId: validated.userId,
      tenantId: validated.tenantId,
      action: validated.action,
      details: validated.details,
      ipAddress: validated.ipAddress,
      userAgent: validated.userAgent,
    });
  } catch (err) {
    // Non-fatal — audit logging must never block the user's primary action.
    // The right place to alert on audit-write failures is the observability
    // backend (EPIC-005) once it lands.
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(
      `[auth:audit] failed to write entry action=${validated.action}: ${message}`,
    );
  }
}

/**
 * Audit context that callers pass through HTTP middleware. Optional — defaults
 * to null IP / userAgent so flows can be called from non-HTTP contexts
 * (background jobs, tests).
 */
export interface AuditContext {
  ipAddress: string | null;
  userAgent: string | null;
  tenantId: string | null;
}

export const EMPTY_AUDIT_CONTEXT: AuditContext = {
  ipAddress: null,
  userAgent: null,
  tenantId: null,
};
