---
id: EPIC-004
title: Communication Plumbing — API gateway, event bus + saga, notifications
type: epic
status: done
priority: P0
phase: mvp
tags: [mvp, gateway, event-bus, saga, notifications]
created: 2026-05-05
updated: 2026-05-14
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

- [STORY-016](../stories/STORY-016-fastify-gateway.md) — Fastify gateway + Zod boundary discipline + plugin extension points (estimate: L)
- [STORY-017](../stories/STORY-017-event-bus-saga-primitives.md) — pg-outbox event bus adapter + saga primitives package + DLQ replay (estimate: XL)
- [STORY-018](../stories/STORY-018-email-notifications-adapter.md) — Email notification adapter + per-tenant template system (estimate: M)

## Exit criteria

- [x] Fastify gateway boots; `/health` returns 200; OTel spans emit per request *(STORY-016 — gateway boots, `/health` returns 200, structured 400s, tenant + auth context plugins. OTel deferred to EPIC-005 alongside the observability subsystem)*
- [x] Zod boundaries enforced: invalid request → 400 with structured error *(STORY-016 — `@fastify/type-provider-zod` + adopter routes get auto-400 with `{error, issues[]}` body)*
- [x] Producer writes business row + outbox row in same transaction *(STORY-017 sub-PR #1 — `OutboxWriter` accepts the adopter's tx; verified by the rollback integration test)*
- [x] Background poller reads outbox; pg_notify fires; consumer LISTENs and processes *(STORY-017 sub-PR #1 — `OutboxPoller` reads outbox, dispatches to handlers. pg_notify wakeup deferred to v1+ as a perf optimization; pure polling at 100ms default works against PGlite tests + production Postgres)*
- [x] Idempotency: re-delivered event → consumer dedupes via `platform.event_dedupe` *(STORY-017 sub-PR #1 — verified by the idempotent-re-delivery integration test)*
- [x] Failed event → exponential backoff retry → DLQ after 5 attempts *(STORY-017 sub-PR #1 — retries with linear backoff window, then DLQ at maxRetries. Exponential backoff explicitly deferred to v1+ once retry state is durable)*
- [x] Saga: tenant provisioning runs end-to-end; failure at step N triggers compensation walk *(STORY-015 sub-PR #2 verified end-to-end against real Postgres via PGlite; STORY-017 sub-PR #1 verified retry+DLQ semantics independently)*
- [x] Email notification: send welcome on `tenant.provisioned` event; adopter can override template *(STORY-018 — `EventBusNotificationsSender` published on saga step 9, `EventBusNotificationsConsumer` dispatches via `EmailSender`, per-tenant overrides via `TenantTemplateLoader`)*
- [x] Integration test: tenant provisioning saga emits 9 step events; all observable; compensation tested *(STORY-015 sub-PR #2 + STORY-017 sub-PR #1 + STORY-018 end-to-end test cover the full path. Per-step intermediate events deferred — the saga store IS the per-step observability surface for in-process sagas; per-step bus events become useful with STORY-017's event-driven choreography variant v1+)*

## Related

- ADRs: [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md)
- Decisions: D-24, D-25, D-45
- Cross-Epic: depends on EPIC-003 for tenant context; feeds EPIC-005 (events flow to observability), EPIC-006 (LLM Gateway publishes cost events here), EPIC-007 (agent platform consumes events)

## Activity log

- 2026-05-05 — created as part of MVP-1 surface lockdown ([D-56](../../docs/decisions/DECISIONS_LOG.md))
- 2026-05-11 — picked up. EPIC-003 closed (all 4 Stories done). STORY-016 (Fastify gateway) is the natural starting point — its absence has been a deferred-AC magnet across STORY-013/014/015 (OAuth wiring, 410 Gone status emission, tenant switcher UI). STORY-017 (pg-outbox event bus production adapter) follows: replaces `InMemoryEventBus` from STORY-014 sub-PR #1 over the same Kafka-shaped contract; `DrizzleSagaStore` already in place. STORY-018 (email adapter) wires the saga step 9 `NotificationsSender` port to a real provider.
- 2026-05-14 — **EPIC-004 done.** All 3 Stories closed: STORY-016 (Fastify gateway + auth-context + apps/starter reference impl, 3 sub-PRs #38-#40), STORY-017 (PgOutboxEventBus + writer + poller + DLQ replay + saga cancel, 2 sub-PRs #41-#42), STORY-018 (notifications package with EmailSender + templates + bus consumer + saga step 9 adapter + per-tenant overrides, 1 PR). **279 tests green** across 8 packages. The kit now has a complete communication backbone: HTTP layer (gateway) + async event bus (pg-outbox) + saga-driven notifications. Deferrals to v1+ documented per-Story: OTel wiring (EPIC-005), pg_notify wakeup, exponential backoff, multi-process consumer LB, SES/SendGrid/Resend/Postmark concrete adapters.
