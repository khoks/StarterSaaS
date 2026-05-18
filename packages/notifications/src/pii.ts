/**
 * PII scrubbing helpers per ADR-0006 observability requirements.
 *
 * The notifications subsystem logs every send + failure. Recipient emails
 * are PII — they should NEVER appear in plain text in logs. We hash them
 * (SHA-256, hex) so:
 *   - Distinct recipients have distinct identifiers (useful for "did the same
 *     user get this email twice?" queries)
 *   - The plaintext email isn't recoverable from logs
 *
 * The hash is also written to `notification.email_sent` / `email_failed`
 * audit events so downstream consumers (observability rollups, billing
 * reconciliation) can correlate without seeing raw emails.
 */

import { createHash } from "node:crypto";

/** Hash an email address (or any PII string) for safe logging. */
export function hashRecipient(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16); // 16 hex chars = 64 bits of entropy; collision-resistant in practice
}

/** Mask an email for human-readable logs: `j***@example.com`. Use this for
 *  CLI output where the operator legitimately needs to see WHICH tenant got
 *  the email (the domain) without exposing the local part. */
export function maskRecipient(email: string): string {
  const idx = email.indexOf("@");
  if (idx < 1) return "***";
  const local = email.slice(0, idx);
  const domain = email.slice(idx);
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(1, local.length - 1))}${domain}`;
}
