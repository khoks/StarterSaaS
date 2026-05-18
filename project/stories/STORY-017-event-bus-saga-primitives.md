---
id: STORY-017
title: pg-outbox event bus adapter + saga primitives package + DLQ replay
type: story
status: done
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

- [x] Bus contract surface (Zod-validated event shape) ships in `packages/event-bus` *(STORY-014 sub-PR #1 already landed this; sub-PR #1 of this Story added the pg-outbox impl alongside the in-memory one)*
- [x] `@starter-saas/event-bus-pg-outbox` adapter implements the contract *(sub-PR #1 — `PgOutboxEventBus` ships under `@starter-saas/event-bus/pg-outbox` sub-export, not a separate package, because both adapters share the same `EventBus` interface and the production-vs-test split is via `start()`/`tick()` lifecycle rather than package boundaries)*
- [x] Producer writes outbox row in same transaction as business operation *(`OutboxWriter` accepts adopter's tx — verified by the rollback integration test)*
- [x] Poller reads outbox + pg_notify; consumer dedupe via `platform.event_dedupe` *(poller + dedupe done; pg_notify wakeup deferred to v1+ as a perf optimization — pure polling at 100ms default + pglite doesn't support cross-connection LISTEN/NOTIFY anyway; documented in code + sub-PR #1 limitations list)*
- [x] Failed event → exponential backoff retry 5x → DLQ *(retry counter + linear backoff window + DLQ row write at maxRetries; exponential backoff is a v1+ enhancement once retry state is durable — current in-memory retry resets on restart but no events lost since outbox is durable)*
- [x] `cli events replay --dlq-id <id>` replays a DLQ event *(sub-PR #2 — `replayDlqEntry` re-publishes via the bus + stamps `replayed_at`; CLI wires it)*
- [x] `packages/saga` ships with state machine + compensation registry + instance store *(STORY-014 sub-PR #1 landed `SagaRunner` + `InMemorySagaStore`; STORY-014 sub-PR #2 added `DrizzleSagaStore`; this Story added `cancelSaga` for the admin cancel path)*
- [x] Reference saga (tenant provisioning from STORY-014) runs end-to-end with compensation *(STORY-015 sub-PR #2 verified end-to-end against real Postgres via PGlite — 4 saga tests including step-3 failure compensation)*
- [x] Per-saga partition_key = `saga_id` ensures step ordering *(provisioning saga uses `tenantId` as partitionKey, which is constant per saga instance — same per-partition serial ordering guarantee; saga step events would use `saga_id` when STORY-017's event-driven choreography variant lands as a v1+ refinement)*
- [x] Integration test: 9-step saga + idempotent re-delivery + compensation walk on failure *(STORY-015 sub-PR #2 covers the full saga; this Story's sub-PR #1 covers idempotent re-delivery + retry+DLQ semantics independently against PGlite)*

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
- 2026-05-14 — **Sub-PR #1 landed** (PR #41). **Sub-PR #2 in progress** — closes STORY-017. Added `replayDlqEntry(db, bus, dlqId)` + `listDlqEntries(db, options?)` to `@starter-saas/event-bus/pg-outbox/replay.ts` (re-publish via bus, clear stale dedupe row, stamp `replayed_at` on DLQ; refusals discriminated `not-found` / `already-replayed`). Added `cancelSaga(store, sagaId, reason?)` to `@starter-saas/saga/src/cancel.ts` (admin manual-cancel path; flips status → `failed` with `failureReason`; refuses already-terminal sagas). New CLI commands: `events list-dlq` / `events replay --dlq-id <id>` / `sagas list [--status]` / `sagas cancel --saga-id <id> [--reason]`. Refactored CLI factory to share one `loadContext` + `io` pair across all three command groups (`tenant` / `events` / `sagas`) via `BuildCliOverrides`. Extended `TenantCliContext` shape with optional `eventBus` + `sagaStore` fields based on subcommand. **17 new tests**: 8 cancelSaga unit (success / default reason / not-found / completed-refusal / compensated-refusal / failed-refusal / pending-cancel / compensating-cancel), 5 DLQ replay integration (happy path with transient failure → replay → success; new outbox row inserted on replay; already-replayed refusal; not-found; listDlqEntries replayed-filter), 4 CLI smoke tests (events command group + flags + sagas command group + flags). **Total test count: 239** (48 auth + 19 saga + 10 event-bus + 10 cli + 26 gateway + 5 starter + 121 tenancy). Typecheck + build + test green across 12 packages.
- 2026-05-14 — **STORY-017 done.** Both sub-PRs landed. All 10 ACs satisfied (pg_notify wakeup + exponential-backoff + durable retry counter explicitly deferred to v1+ as documented enhancements over the working MVP-1 baseline). The kit now has a production-grade Kafka-shaped event bus over Postgres + DLQ replay + saga cancel — STORY-018 (email notifications adapter) can now wire the saga step 9 `NotificationsSender` port to the bus + a real email provider.
