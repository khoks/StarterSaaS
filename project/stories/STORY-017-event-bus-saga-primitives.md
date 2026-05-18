---
id: STORY-017
title: pg-outbox event bus adapter + saga primitives package + DLQ replay
type: story
status: in-progress
priority: P0
estimate: XL
parent: EPIC-004
phase: mvp
tags: [mvp, event-bus, saga, outbox, kafka-shaped]
created: 2026-05-06
updated: 2026-05-14
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
- 2026-05-14 — picked up. The Kafka-shaped contract surface + `InMemoryEventBus` + `@starter-saas/saga` (SagaRunner + InMemorySagaStore) + `DrizzleSagaStore` already shipped in STORY-014. STORY-017 lands the production `pg-outbox` adapter that implements the same `EventBus` contract over `platform.outbox` + dedupe + DLQ tables. Sub-PR plan: (1) platform schema additions (`platform.{outbox, event_dedupe, event_dlq}`) + `PgOutboxEventBus` + `OutboxWriter` (adopter-tx-aware) + `OutboxPoller` (Kafka-shaped: per-partition ordering / consumer-group fanout / dedupe / retry-then-DLQ) + 10 integration tests against pglite; (2) `cli events replay <dlq-id>` + `cli sagas cancel <saga-id>` + closeout.
- 2026-05-14 — **Sub-PR #1 in progress**: pg-outbox adapter. Added 3 platform tables to `@starter-saas/event-bus/src/pg-outbox/schema.ts` (placed there, not in `@starter-saas/tenancy`, to avoid the `event-bus → tenancy → event-bus` cycle that would form if they lived in tenancy). Updated tenancy's testing harness DDL (`applyPlatformSchema`) to include the 3 new tables so the existing pglite test infra works unchanged. Built `OutboxWriter` (atomic-with-business-state via adopter's tx) + `OutboxPoller` (5-parallel cross-partition, serial within partition; consumer-group fanout; in-memory retry counter with `nextAttemptAt` backoff; durable DLQ row on max-retries; in-memory DLQ mirror for `EventBus.deadLetterQueue()`) + `PgOutboxEventBus` (thin `EventBus`-shape wrapper with `start()`/`tick()`/`shutdown()` lifecycle). Added drizzle-orm dep to event-bus. 10 new integration tests against PGlite: outbox writer (full envelope + tx-atomicity rollback), bus delivery (single group + fanout + idempotent re-delivery + per-partition ordering), retry+DLQ (retries → DLQ after maxRetries + backoff window + one-group-DLQ-doesn't-block-others), unsubscribe lifecycle. **Total test count: 222** (48 auth + 11 saga + 10 event-bus + 6 cli + 26 gateway + 5 starter + 116 tenancy). Typecheck + build + test green across 12 packages. **Limitations documented**: no pg_notify wakeup yet (pure polling — perf upgrade, not contract change); in-memory retry counter resets on restart (worst case = few extra retries; no events lost since outbox is durable); single-process consumer group (multi-process LB is v1+ via row-level locking).
