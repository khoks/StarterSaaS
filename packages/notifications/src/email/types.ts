/**
 * EmailSender port — adopter wires SES / SendGrid / Resend / Postmark / SMTP
 * etc. by implementing this interface.
 *
 * MVP-1 ships:
 *   - `ConsoleEmailSender` — logs the email to stdout (dev / smoke tests)
 *   - `NoopEmailSender` — no-op for tests
 *
 * Adopters writing production adapters take care to:
 *   - PII-scrub before logging (use `hashRecipient` from `../pii.js`)
 *   - Map provider errors into thrown `Error` so the bus consumer's retry/DLQ
 *     semantics kick in correctly
 *   - Respect the `htmlBody` field (fall back to `textBody` for plain-text senders)
 */

import type { RenderedEmail } from "../contracts.js";

export interface EmailSender {
  /** Send one rendered email. Throws on failure — the consumer's retry-then-DLQ
   *  flow handles transient errors. */
  send(email: RenderedEmail): Promise<void>;
}
