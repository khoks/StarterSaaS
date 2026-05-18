/**
 * `ConsoleEmailSender` — logs the rendered email to stdout. Useful for:
 *   - Local dev (you see the welcome / verification emails in your terminal)
 *   - Smoke tests in CI (no external network dep)
 *   - The kit's `apps/starter` reference impl as the default sender until
 *     adopter wires a real provider
 *
 * Production adopters MUST swap in a real `EmailSender` implementation
 * (SES / SendGrid / Resend / Postmark / SMTP); this sender does NOT deliver
 * to real inboxes.
 *
 * PII discipline: only the masked recipient + subject + body LENGTHS are
 * logged by default. Set `verbose: true` to dump the full body (dev only).
 */

import type { RenderedEmail } from "../contracts.js";
import { maskRecipient } from "../pii.js";
import type { EmailSender } from "./types.js";

export interface ConsoleEmailSenderOptions {
  /** Capture sink — defaults to `console.log`. Tests inject an array push. */
  log?: (msg: string) => void;
  /** When true, prints the full subject + body (dev only). Default false. */
  verbose?: boolean;
}

export class ConsoleEmailSender implements EmailSender {
  private readonly log: (msg: string) => void;
  private readonly verbose: boolean;

  constructor(options: ConsoleEmailSenderOptions = {}) {
    // eslint-disable-next-line no-console
    this.log = options.log ?? ((msg) => console.log(msg));
    this.verbose = options.verbose ?? false;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async send(email: RenderedEmail): Promise<void> {
    const recipient = maskRecipient(email.to.email);
    const tenant = email.tenantId ?? "_global";
    if (!this.verbose) {
      this.log(
        `[notifications] tenant=${tenant} template=${email.templateId} to=${recipient} subject=${email.subject.length}ch body=${email.textBody.length}ch`,
      );
      return;
    }
    this.log(
      `[notifications] tenant=${tenant} template=${email.templateId} to=${recipient}`,
    );
    this.log(`  Subject: ${email.subject}`);
    this.log(`  Text Body:\n${email.textBody}`);
    if (email.htmlBody !== undefined) {
      this.log(`  HTML Body:\n${email.htmlBody}`);
    }
  }
}
