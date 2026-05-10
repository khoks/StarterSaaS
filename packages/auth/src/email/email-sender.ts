/**
 * Default email sender — no-op that logs to console.
 *
 * Adopter swaps in a real adapter (SES / SendGrid / Resend / Postmark) via
 * `starter.config.ts → auth.emailSender`. The real adapters live in the
 * notifications subsystem (EPIC-004) and the kit composes them at boot.
 *
 * Per [ADR-0007](../../../../docs/architecture/ADR-0007-auth-provider.md) +
 * D-13 (founder's first engineer): dev demo flow works without provisioning
 * an email provider — the engineer reads verification + reset links from
 * stdout. Production swaps in a real sender before launch.
 */

import type { EmailMessage, EmailSender } from "../types.js";

/**
 * No-op sender. Logs the structured message to console (subject + recipient
 * + a truncated preview of the body). Marker prefix makes it grep-friendly.
 */
export const noopEmailSender: EmailSender = {
  // eslint-disable-next-line @typescript-eslint/require-await
  async send(message: EmailMessage): Promise<void> {
    const previewLength = 200;
    const preview = message.bodyText.slice(0, previewLength);
    const truncated = message.bodyText.length > previewLength ? "..." : "";
    // eslint-disable-next-line no-console
    console.log(
      `[auth:email:noop] to=${message.to} subject="${message.subject}" body="${preview}${truncated}"`,
    );
  },
};
