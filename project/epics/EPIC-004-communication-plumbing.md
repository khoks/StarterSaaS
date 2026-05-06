---
id: EPIC-004
title: Communication Plumbing — API gateway, event bus + saga, notifications
type: epic
status: backlog
priority: P0
phase: mvp
tags: [mvp, gateway, event-bus, saga, notifications]
created: 2026-05-05
updated: 2026-05-05
---

## Goal

Ship the **communication backbone** for MVP-1: HTTP gateway with Zod-validated boundaries + event bus with Kafka-shaped contract + email notifications adapter. This Epic enables all the inter-subsystem communication patterns the rest of the kit depends on.

## Capabilities (per [docs/roadmap/MVP.md](../../docs/roadmap/MVP.md))

- **API gateway** ([D-24](../../docs/decisions/DECISIONS_LOG.md) / [D-25](../../docs/decisions/DECISIONS_LOG.md)) — Fastify with strict TS + Zod schemas on every public boundary (HTTP route inputs/outputs); plugin-friendly per Fastify model
- **Event bus + saga** ([D-45](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md)) — Kafka-shaped contract surface from day 1; `@starter-saas/event-bus-pg-outbox` MVP-1 adapter (atomic-with-business-state via same-transaction outbox writes; pg_notify-based fanout); `packages/saga` for state machine + compensation registry; `platform.{outbox, event_dedupe, event_dlq, saga_instances}` tables
- **Notifications** — email adapter MVP-1 (SES / SendGrid / Resend / similar); typed notification contracts (Zod); per-tenant template overrides; SMS / push / WhatsApp adapters slated v1+

## Scope

- Fastify gateway scaffold + Zod-validated route handlers
- Per-tenant context middleware (extract active tenant from session per EPIC-003)
- Plugin extension-points exposed for adopter customization
- Event bus pg-outbox adapter end-to-end (producer → outbox → poller → pg_notify → consumer dedupe → ACK)
- Saga primitive with compensation registry; reference implementation = tenant provisioning saga from EPIC-003
- DLQ writer + replay CLI (`cli events replay`)
- Email notification adapter (one default + adapter contract for v1+ providers)
- Notification template system (per-tenant override pattern)

## Out of scope (deferred per MVP.md § Out of scope)

- Kafka native adapter (v1 target — pre-architected by D-45)
- Redis Streams / AWS EventBridge / GCP Pub/Sub event-bus adapters (v1+)
- SMS (Twilio) / push (FCM/APNs) / WhatsApp notification adapters (v1+)
- External saga orchestrators (Temporal / Conductor — v2)
- Cron / scheduled-task subsystem (v2)
- Event replay UI in admin panel (v1+)

## Stories under this Epic

(Drafted in [STORY-012](../stories/STORY-012-mvp1-scope-lockdown.md) Q2; ≥3 expected.)

## Exit criteria

- [ ] Fastify gateway boots; `/health` returns 200; OTel spans emit per request
- [ ] Zod boundaries enforced: invalid request → 400 with structured error
- [ ] Producer writes business row + outbox row in same transaction
- [ ] Background poller reads outbox; pg_notify fires; consumer LISTENs and processes
- [ ] Idempotency: re-delivered event → consumer dedupes via `platform.event_dedupe`
- [ ] Failed event → exponential backoff retry → DLQ after 5 attempts
- [ ] Saga: tenant provisioning runs end-to-end; failure at step N triggers compensation walk
- [ ] Email notification: send welcome on `tenant.provisioned` event; adopter can override template
- [ ] Integration test: tenant provisioning saga emits 9 step events; all observable; compensation tested

## Related

- ADRs: [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md)
- Decisions: D-24, D-25, D-45
- Cross-Epic: depends on EPIC-003 for tenant context; feeds EPIC-005 (events flow to observability), EPIC-006 (LLM Gateway publishes cost events here), EPIC-007 (agent platform consumes events)

## Activity log

- 2026-05-05 — created as part of MVP-1 surface lockdown ([D-56](../../docs/decisions/DECISIONS_LOG.md))
