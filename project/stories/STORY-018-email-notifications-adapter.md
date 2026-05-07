---
id: STORY-018
title: Email notification adapter + per-tenant template system
type: story
status: backlog
priority: P0
estimate: M
parent: EPIC-004
phase: mvp
tags: [mvp, notifications, email]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Ship MVP-1 email notification adapter (one default + adapter contract slot for v1+ providers like SES / SendGrid / Resend / Mailgun). Notification delivery is event-bus-driven — consumer subscribes to topics like `platform.user_signup`, `tenant.provisioned`, `auth.password_reset` and dispatches via the adapter. Per-tenant template overrides via `tenant_xyz.notification_templates`. SMS / push / WhatsApp adapters slated v1+.

## Acceptance criteria

- [ ] `packages/notifications` defines the adapter contract (Zod-typed)
- [ ] One concrete email adapter ships MVP-1 (e.g., SES default for AWS, equivalent for GCP)
- [ ] Event-bus consumer subscribes to notification topics; dispatches via adapter
- [ ] Default templates ship for: welcome, password reset, email verification, tenant invitation
- [ ] Per-tenant template overrides in `tenant_xyz.notification_templates`
- [ ] PII scrubbing applied per [ADR-0006](../../docs/architecture/ADR-0006-observability.md) (no full email content in logs)
- [ ] Integration test: tenant provisioning saga emits `tenant.provisioned` → consumer dispatches welcome email → adapter delivers → audit logged

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: STORY-013 (welcome email on sign-up); STORY-014 (welcome email on tenant provisioning)
- Blocked by: STORY-017 (event bus must exist)

## Related

- ADRs: [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md), [ADR-0006](../../docs/architecture/ADR-0006-observability.md)

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
