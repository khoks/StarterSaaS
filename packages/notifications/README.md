# @starter-saas/notifications

Pluggable email + template subsystem per [STORY-018](../../project/stories/STORY-018-email-notifications-adapter.md), [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md), and [ADR-0006](../../docs/architecture/ADR-0006-observability.md).

## What's in this package

- **`EmailSender` contract** + two MVP-1 impls:
  - `ConsoleEmailSender` — logs to stdout (dev / smoke tests; PII-scrubbed by default)
  - `NoopEmailSender` — captures sends in `.sent` (tests)
- **`TemplateRegistry`** with 4 kit-default templates: `welcome`, `password-reset`, `email-verification`, `tenant-invitation`. Adopter-overrideable via `registry.register(...)` + per-tenant overrides via a `TenantTemplateLoader` hook.
- **`{{var}}` rendering** — minimal Handlebars-like substitution; adopters needing helpers/conditionals plug in Handlebars/Liquid/Pug as their own `TemplateRegistry` impl.
- **`EventBusNotificationsConsumer`** — subscribes to `notification.email_requested` on the bus + dispatches via the configured sender. Emits `notification.email_sent` / `notification.email_failed` audit events with PII-hashed recipients.
- **`EventBusNotificationsSender`** — concrete `NotificationsSender` impl for the saga step 9 port from `@starter-saas/tenancy/provisioning`. Publishes events instead of blocking the saga on email delivery.
- **`NOTIFICATIONS_MIGRATION`** — per-tenant `notification_templates` DDL; compose alongside `RBAC_MIGRATION` in your adopter migrations list.
- **PII helpers**: `hashRecipient` (audit) + `maskRecipient` (CLI output).

## Topics

| Topic | Producers | Consumers |
|---|---|---|
| `notification.email_requested` | `EventBusNotificationsSender`; adopter code | `EventBusNotificationsConsumer` |
| `notification.email_sent` | the consumer (after success) | observability + billing rollups |
| `notification.email_failed` | the consumer (after each retry) | alerting / pager |

`partitionKey = tenantId` so emails for a single tenant process in order. `idempotencyKey` follows the kit convention `{producer}:{business_id}:{action}` (e.g. `notifications:tenant-welcome:<tenantId>`) so the pg-outbox bus dedupes correctly across retries.

## Production adapter contract

Adopters wire SES / SendGrid / Resend / Postmark / SMTP / etc by implementing the `EmailSender` interface:

```typescript
import type { EmailSender, RenderedEmail } from "@starter-saas/notifications";

export class SesEmailSender implements EmailSender {
  constructor(private readonly client: SesClient) {}
  async send(email: RenderedEmail): Promise<void> {
    await this.client.sendEmail({
      Destination: { ToAddresses: [email.to.email] },
      Message: {
        Subject: { Data: email.subject },
        Body: {
          Text: { Data: email.textBody },
          ...(email.htmlBody ? { Html: { Data: email.htmlBody } } : {}),
        },
      },
      Source: process.env.NOTIFICATIONS_FROM!,
    });
  }
}
```

Adopters MUST:
- Throw on provider failures so the bus's retry-then-DLQ flow handles transients
- Never log raw recipient addresses — use `hashRecipient(...)` for audit fields, `maskRecipient(...)` for any operator-facing output

## PII discipline (per ADR-0006)

- `notification.email_sent` + `notification.email_failed` events carry `recipientHash` (SHA-256, 16 hex chars) — never the plaintext address
- `ConsoleEmailSender`'s default mode logs only `maskRecipient(...)` (first char + masked local + visible domain), subject length, body length — not the content. Set `verbose: true` for dev-only full dumps.

## Status

**MVP-1 in flight** — STORY-018 closes EPIC-004 once this lands. SMS / push / WhatsApp adapters slated v1+ (same `notification.<channel>_requested` topic pattern).
