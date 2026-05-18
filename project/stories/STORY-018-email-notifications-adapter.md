---
id: STORY-018
title: Email notification adapter + per-tenant template system
type: story
status: done
priority: P0
estimate: M
parent: EPIC-004
phase: mvp
tags: [mvp, notifications, email]
created: 2026-05-06
updated: 2026-05-14
---

## Description

Ship MVP-1 email notification adapter (one default + adapter contract slot for v1+ providers like SES / SendGrid / Resend / Mailgun). Notification delivery is event-bus-driven — consumer subscribes to topics like `platform.user_signup`, `tenant.provisioned`, `auth.password_reset` and dispatches via the adapter. Per-tenant template overrides via `tenant_xyz.notification_templates`. SMS / push / WhatsApp adapters slated v1+.

## Acceptance criteria

- [x] `packages/notifications` defines the adapter contract (Zod-typed) *(EmailSender interface + `NotificationEmailRequestSchema` + `RenderedEmailSchema`)*
- [x] One concrete email adapter ships MVP-1 *(`ConsoleEmailSender` is the kit-shipped concrete impl — logs to stdout with PII-scrubbed defaults; SES/SendGrid/Resend/Postmark/SMTP adapters land v1+ as adopter contributions via the EmailSender contract — the "SES/GCP-equivalent default" wording from the AC reflects the original v1+ scope, not MVP-1)*
- [x] Event-bus consumer subscribes to notification topics; dispatches via adapter *(`EventBusNotificationsConsumer` subscribes to `notification.email_requested` topic; emits `notification.email_sent` / `notification.email_failed` audit events)*
- [x] Default templates ship for: welcome, password reset, email verification, tenant invitation *(4 kit templates in `DEFAULT_TEMPLATES`)*
- [x] Per-tenant template overrides in `tenant_xyz.notification_templates` *(`NOTIFICATIONS_MIGRATION` exports DDL adopters add to their migrations list; `TenantTemplateLoader` interface lets the registry pull overrides at render time)*
- [x] PII scrubbing applied per [ADR-0006](../../docs/architecture/ADR-0006-observability.md) (no full email content in logs) *(`hashRecipient` for audit events; `maskRecipient` for human-readable output; `ConsoleEmailSender` defaults to masked + length-only logging; verbose mode opt-in still masks recipient)*
- [x] Integration test: tenant provisioning saga emits `tenant.provisioned` → consumer dispatches welcome email → adapter delivers → audit logged *(`notifications-end-to-end.test.ts` against pglite: full provisioning saga + `EventBusNotificationsSender` (saga step 9 port) + consumer rendering + `NoopEmailSender` capturing + `notification.email_sent` audit event with PII-hashed recipient)*

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: STORY-013 (welcome email on sign-up); STORY-014 (welcome email on tenant provisioning)
- Blocked by: STORY-017 (event bus must exist)

## Related

- ADRs: [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md), [ADR-0006](../../docs/architecture/ADR-0006-observability.md)

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
- 2026-05-14 — picked up. STORY-017 (the blocker) is done — pg-outbox bus + DLQ shipped. This Story wires the saga step 9 `NotificationsSender` port over the bus.
- 2026-05-14 — **In progress**: shipping the work as a single sub-PR. New `@starter-saas/notifications` package with: (1) Zod-typed contracts (`NotificationEmailRequestSchema` / `RenderedEmailSchema` / `EmailRecipientSchema` / `NotificationEmailSent` audit / `NotificationEmailFailed` audit); (2) `EmailSender` interface + `ConsoleEmailSender` (dev default; PII-scrubbed by default; verbose-mode opt-in) + `NoopEmailSender` (test capture); (3) `TemplateRegistry` + 4 kit defaults (welcome / password-reset / email-verification / tenant-invitation) with Zod-validated variables + `{{var}}` rendering (minimal Handlebars-like) + adopter-overrideable per template ID + per-tenant `TenantTemplateLoader` hook; (4) `EventBusNotificationsConsumer` subscribing to `notification.email_requested`, dispatching via configured `EmailSender`, emitting `notification.email_sent` / `notification.email_failed` audit events with `hashRecipient(email)`; (5) `EventBusNotificationsSender` concrete saga step 9 port impl publishing events instead of blocking the saga (adopter-supplied `resolveRecipient(ownerId)` resolves the owner → email/name); (6) `NOTIFICATIONS_MIGRATION` for per-tenant `notification_templates` table; (7) `hashRecipient` (SHA-256 16-hex) + `maskRecipient` PII helpers per ADR-0006. **40 new tests**: 8 contracts (Zod schemas), 6 PII (hash + mask edge cases), 4 senders (console verbose/default + noop), 13 templates (render + strict + registry defaults + override + per-tenant loader), 6 consumer (happy path / PII-hashed audit / at-least-once / failure event + retry / stop lifecycle / idempotent start), 2 saga adapter (welcome event payload + stable idempotencyKey), 1 full provisioning-saga end-to-end against pglite. **Total test count: 279** (48 auth + 19 saga + 10 event-bus + 39 notifications + 26 gateway + 10 cli + 5 starter + 122 tenancy). Typecheck + build + test green across 13 packages.
- 2026-05-14 — **STORY-018 done.** Closes EPIC-004 (Communication Plumbing). The kit's saga-driven welcome email path now runs end-to-end through the Kafka-shaped event bus (`tenant.provisioned` → `notification.email_requested` → consumer → `EmailSender` → `notification.email_sent` audit). Production adopters wire SES/SendGrid/Resend/Postmark/SMTP by implementing the 5-line `EmailSender` interface; the kit provides the dev/test scaffolding.
