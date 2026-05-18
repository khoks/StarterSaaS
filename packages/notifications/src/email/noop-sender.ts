/**
 * `NoopEmailSender` — discards the email. Useful for tests where adopter
 * wires the bus + consumer but doesn't care about actual delivery.
 *
 * Distinct from `ConsoleEmailSender` (which logs) because tests benefit from
 * a no-output sender that can also expose a `sent` capture array for
 * assertions.
 */

import type { RenderedEmail } from "../contracts.js";
import type { EmailSender } from "./types.js";

export class NoopEmailSender implements EmailSender {
  /** Captured deliveries — tests assert against this array. */
  readonly sent: RenderedEmail[] = [];

  // eslint-disable-next-line @typescript-eslint/require-await
  async send(email: RenderedEmail): Promise<void> {
    this.sent.push(email);
  }
}
