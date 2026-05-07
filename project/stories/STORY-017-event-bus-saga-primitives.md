---
id: STORY-017
title: pg-outbox event bus adapter + saga primitives package + DLQ replay
type: story
status: backlog
priority: P0
estimate: XL
parent: EPIC-004
phase: mvp
tags: [mvp, event-bus, saga, outbox, kafka-shaped]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Implement `@starter-saas/event-bus-pg-outbox` as MVP-1 default adapter per [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md). Bus contract surface is Kafka-shaped from day 1 (topic + partition_key + consumer_group + idempotency_key + headers). Pg-outbox adapter implements Kafka semantics over Postgres NOTIFY + outbox table. Producer writes outbox row + business row in same DB transaction. Background poller (default 100ms interval, configurable) reads `platform.outbox` and emits NOTIFY events. Consumers LISTEN per topic and dedupe via `platform.event_dedupe`. Failed events → exponential backoff retry up to 5 attempts → DLQ at `platform.event_dlq`. `packages/saga` ships as separate package with state machine + compensation registry + instance store.

## Acceptance criteria

- [ ] Bus contract surface (Zod-validated event shape) ships in `packages/event-bus`
- [ ] `@starter-saas/event-bus-pg-outbox` adapter implements the contract
- [ ] Producer writes outbox row in same transaction as business operation
- [ ] Poller reads outbox + pg_notify; consumer dedupe via `platform.event_dedupe` (30-day TTL)
- [ ] Failed event → exponential backoff retry 5x → DLQ
- [ ] `cli events replay --dlq-id <id>` replays a DLQ event
- [ ] `packages/saga` ships with state machine + compensation registry + instance store
- [ ] Reference saga (tenant provisioning from STORY-014) runs end-to-end with compensation
- [ ] Per-saga partition_key = `saga_id` ensures step ordering
- [ ] Integration test: 9-step saga + idempotent re-delivery + compensation walk on failure

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: every Story that emits events (most of MVP-1)
- Blocked by: STORY-014 (`platform` schema must exist)

## Related

- ADRs: [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md)
- Decisions: D-45

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
