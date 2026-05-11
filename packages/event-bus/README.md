# @starter-saas/event-bus

Kafka-shaped event bus contract for StarterSaaS. Per [D-45](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md): the contract surface is **Kafka-shaped from day 1** so the MVP-1 pg-outbox adapter and v1 native-Kafka adapter are drop-in swaps — adopter code is unchanged.

## What's in this package (STORY-014 sub-PR #1)

- **Types** (`src/types.ts`) — `Event<T>`, `EventBus`, `EventHandler<T>`, `Subscription`, `SubscribeOptions`, `DeadLetterEntry`. `EventSchema` Zod boundary-validator for untrusted producers.
- **InMemoryEventBus** (`src/in-memory.ts`) — in-process adapter for tests + in-process saga execution. Preserves Kafka semantics: per-partition ordering inside a consumer group, consumer-group load balancing, at-least-once delivery with retry, DLQ on exhausted retries.

## What's coming in later Stories

- `@starter-saas/event-bus-pg-outbox` — **MVP-1 default**. STORY-017. Kafka semantics over Postgres NOTIFY + `platform.outbox` table; producer writes event in same DB transaction as business state (no dual-write).
- `@starter-saas/event-bus-kafka` — **v1 target**. Native Kafka. Drop-in adapter swap.
- v1+ adapters: Redis Streams, AWS EventBridge, GCP Pub/Sub.

## Usage (in tests + saga execution)

```typescript
import { InMemoryEventBus, type Event } from "@starter-saas/event-bus";

const bus = new InMemoryEventBus();

// Subscribe (Kafka consumer-group semantics)
const sub = bus.subscribe<MyPayload>(
  "tenant_abc",
  { consumerGroup: "audit-writer", maxRetries: 3 },
  async (event) => { /* handle event */ },
);

// Publish (preserves order per partitionKey)
await bus.publish<MyPayload>({
  topic: "tenant_abc",
  partitionKey: "saga-instance-123",
  idempotencyKey: "tenant-svc:user-42:created",
  payload: { ... },
  headers: { sagaId: "saga-instance-123" },
});

// In test teardown
sub.unsubscribe();
await bus.shutdown();
```

## Semantics preserved across adapters

| Property | InMemory | pg-outbox (planned) | Kafka (planned) |
|---|---|---|---|
| Per-partition ordering | ✓ via queued promise chain | ✓ via outbox row sequence | ✓ via Kafka partitions |
| Consumer-group load balance | ✓ round-robin within group | ✓ via `consumer_group` column claim | ✓ native |
| At-least-once delivery | ✓ retry-then-DLQ | ✓ outbox row stays until ACKed | ✓ native |
| Idempotency dedupe | (consumer's responsibility) | ✓ `platform.event_dedupe` | (consumer's responsibility — usually Kafka offsets) |
| Atomic with business state | ✗ (in-memory) | ✓ same DB transaction | ✗ (use transactional outbox pattern even here) |

## Status

**In progress** — [STORY-014](../../project/stories/STORY-014-tenancy-provisioning-saga.md) sub-PR #1. Tests cover publish/subscribe roundtrip, consumer-group routing, partition ordering, retry-then-DLQ, unsubscribe, shutdown.
