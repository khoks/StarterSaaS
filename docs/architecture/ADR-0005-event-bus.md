# ADR-0005 — Event bus + saga choreography pattern (Kafka-shaped contract; pg-outbox MVP-1; native Kafka v1)

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)
- **Supersedes:** (none)
- **Superseded by:** (none)

---

## Context

[D-44 / ADR-0004](./ADR-0004-multi-tenancy.md) locked the kit's **first concrete saga** — the 9-step tenant-provisioning flow. Its requirements (ordered events per saga instance, at-least-once delivery, idempotency keys, dead-letter handling, observable per-step state) set the floor for the event bus.

Constraints from prior decisions:

- [D-13](../decisions/DECISIONS_LOG.md) — founder's-first-engineer persona prefers no exotic ops; zero-additional-deploy story matters at MVP-1 demo.
- [D-15](../decisions/DECISIONS_LOG.md) — AI-first; AI Subsystem 1 (Customer Profile Builder) consumes business events from the bus.
- [D-16](../decisions/DECISIONS_LOG.md) — bus is an adapter slot; adopters can swap.
- [D-32](../decisions/DECISIONS_LOG.md) / [D-33](../decisions/DECISIONS_LOG.md) — same Postgres holds tenant data; outbox table can co-locate.

**Critical design call by user:** Kafka is the **v1 target state**, not v2+ as initially proposed. This means the MVP-1 implementation must be **architected for Kafka migration** from day 1 — the bus contract surface is **Kafka-shaped**, and the `pg-outbox` adapter is "Kafka semantics over Postgres," not a Postgres-NOTIFY-flavored alternative. When v1 ships the native Kafka adapter, adopter code shouldn't need to change — only the `starter.config.ts` adapter swap.

## Decision

### Bus contract surface — Kafka-shaped from day 1

Every event that crosses the bus has these fields (Zod schema enforces per [D-25](../decisions/DECISIONS_LOG.md)):

```typescript
export const EventSchema = z.object({
  topic: z.string(),                    // routing key — like Kafka topic
  partition_key: z.string(),            // ordering key within topic — like Kafka partition_key
  payload: z.unknown(),                 // event body (per-topic schema enforced separately)
  headers: z.object({
    idempotency_key: z.string(),        // required — pattern: {producer}:{business_id}:{action}
    correlation_id: z.string().optional(),
    trace_id: z.string().optional(),    // distributed tracing
    saga_id: z.string().optional(),     // saga instance identifier
    occurred_at: z.string().datetime(), // ISO timestamp
    schema_version: z.string(),         // for forward-compat
  }),
});

export interface ConsumerSubscription {
  topic: string;
  consumer_group: string;               // like Kafka consumer group
  handler: (event: Event) => Promise<void>;
}
```

Producers publish to a `topic` with a `partition_key`; consumers subscribe to a `topic` within a named `consumer_group` (each group sees each event once). This is **the Kafka mental model** — every adapter implements it.

### Adapters

| Adapter | Phase | Notes |
|---|---|---|
| **`@starter-saas/event-bus-pg-outbox`** | **MVP-1 default** | Kafka semantics over Postgres NOTIFY + outbox table |
| **`@starter-saas/event-bus-kafka`** | **v1 target** | Native Kafka — drop-in adapter swap; adopter code unchanged |
| `@starter-saas/event-bus-redis-streams` | v1+ | High-throughput option for adopters not on Kafka |
| `@starter-saas/event-bus-aws-eventbridge` | v1+ | AWS-native managed |
| `@starter-saas/event-bus-gcp-pubsub` | v1+ | GCP-native managed |
| `@starter-saas/event-bus-nats` | v2+ | NATS-using shops |

Adopter picks via `starter.config.ts`:

```typescript
eventBus: { adapter: "pg-outbox" }     // MVP-1 default
eventBus: { adapter: "kafka", config: { brokers: ["..."] } }  // v1+ swap
```

### MVP-1 implementation: pg-outbox adapter

#### Outbox write (producer side)

```text
BEGIN TRANSACTION
  INSERT INTO tenant_xyz.business_table (...);
  INSERT INTO platform.outbox (
    topic, partition_key, payload, headers,
    created_at, processed_at
  ) VALUES (...);
COMMIT;
```

Same DB transaction as the business operation — solves the dual-write problem. Outbox row persists until processed.

#### Outbox poller (background)

- Default poll interval: **100ms** (adopter-tunable in `starter.config.ts`)
- `SELECT * FROM platform.outbox WHERE processed_at IS NULL ORDER BY created_at, partition_key LIMIT 100;`
- For each row: `pg_notify(channel, payload)`; on consumer ACK, `UPDATE platform.outbox SET processed_at = now()`.
- Per-partition_key serialization: events with the same partition_key execute strictly in order (prevents out-of-order saga steps).

#### Consumer (subscriber side)

- LISTEN per topic channel: `tenant_{uuid}` for tenant-scoped events; `platform` for cross-tenant.
- Dedupe via `platform.event_dedupe` keyed by `(consumer_group, idempotency_key)` with **30-day TTL** default.
- On dedupe hit → skip (idempotent re-delivery).
- On handler success → INSERT into `platform.event_dedupe` → ACK to outbox.
- On handler failure → retry with exponential backoff up to **5 attempts default** → after exhaustion, write to `platform.event_dlq` with full event + last-error + retry-history.

### Saga choreography pattern

**Event-driven choreography**, not orchestration via central runner.

- Each saga's state machine is encoded in TS code; no external orchestrator (Temporal / Conductor) at MVP-1.
- Saga instances tracked in `platform.saga_instances`:

```text
saga_id (uuid)         e.g., "tenant_provisioning_a3f2..."
saga_type              e.g., "tenant_provisioning"
current_step           e.g., "step_5_provision_secrets"
status                 in_progress | completed | compensating | failed
payload                {tenant_id: "...", plan: "pro", ...}
steps                  [{step_1: completed, ...}, {step_5: failed, error: "..."}]
created_at, updated_at
```

- Each step subscribes to the previous step's completion event + business prerequisites.
- **Compensation registry** — each step has a `compensate(state)` function. On failure, the saga walks the compensation registry in reverse order; compensations themselves emit as events (so they're observable + retriable).
- **Saga step timeout default: 30 seconds** (adopter-tunable). Exceeded → step marked failed → compensation walk.
- **Saga instance retention: 90 days** post-completion (audit trail), then archived.

**Reference implementation:** the 9-step tenant-provisioning saga from D-44 / ADR-0004.

### Package separation

- **`packages/event-bus`** — bus core + adapter contracts + `pg-outbox` impl + Kafka adapter (v1)
- **`packages/saga`** — saga state machine + compensation registry + instance tracking

Separate packages because saga primitives are useful even outside the event bus (e.g., for in-process step machines, internal choreography that doesn't cross subsystem boundaries).

### Side picks (locked)

| Setting | Default | Adopter-tunable? |
|---|---|---|
| Outbox poll interval | 100ms | Yes |
| Max retry count | 5 (then DLQ) | Yes |
| DLQ table | `platform.event_dlq` | No (location fixed) |
| Saga instance retention | 90 days post-completion | Yes |
| Idempotency key format | `{producer_name}:{business_id}:{action}` | Producer-side convention |
| Idempotency key required | Yes (Zod-enforced) | No |
| Saga step timeout | 30 seconds | Yes |
| Partition key for saga events | `saga_id` (ensures ordering) | Producer-side convention |
| NOTIFY channel naming | `tenant_{uuid}` (tenant-scoped) / `platform` (cross-tenant) | No |
| Event dedupe TTL | 30 days | Yes |

## Considered alternatives

### Bus selection

- **Postgres NOTIFY alone (no outbox)** — rejected: lossy on restart; no durability; events between producer COMMIT and consumer NOTIFY can be lost on a crash.
- **Redis Streams as MVP-1 default** — rejected: requires Redis as additional deploy at MVP-1 (breaks D-13 zero-additional-deploy preference); becomes v1+ adapter for adopters who prefer it.
- **Kafka as MVP-1 default** — rejected: heavy operational overhead at MVP-1 scale; adopter must run Kafka cluster from day 1.
- **NATS / RabbitMQ MVP-1** — rejected: not the target state per user direction; would mean two adapters to deprecate (NATS at MVP-1, then Kafka at v1).
- **AWS EventBridge / GCP Pub/Sub MVP-1 default** — rejected: cloud-locked; can't run cross-cloud or local-dev.

### Contract surface shape

- **Bus-flavored-by-implementation** (different APIs per adapter) — rejected: forces adopters to rewrite consumer code when migrating MVP-1 → v1.
- **Generic pub/sub semantics** (just topic + payload, no partition_key / consumer_group) — rejected: works for naive cases but fails ordered-saga-step requirement; would be a contract break when Kafka adapter ships.
- **Kafka-shaped from day 1** (this decision) — picked: minimizes future migration friction; matches industry de-facto standard.

### Saga pattern

- **Orchestration with external runner** (Temporal / Conductor / Camunda) — rejected for MVP-1: external operational dependency contradicts D-13 zero-additional-deploy. Revisit at v2+ if sagas grow >15 steps.
- **Choreography with no state tracking** — rejected: observability and resume-from-failure require per-step state; `platform.saga_instances` is the canonical record.
- **Single combined `event-bus-and-saga` package** — rejected: saga primitives are useful in non-bus contexts.

## Consequences

### Positive

- **MVP-1 to v1 migration is an adapter swap** — adopter changes one config line; consumer code unchanged. Honors the user's "Kafka is target state" directive.
- **Atomic with business state** — outbox-in-same-transaction solves the dual-write problem permanently for the pg-outbox adapter.
- **Zero-additional-deploy at MVP-1** — uses existing Postgres from D-32; no new infrastructure.
- **Industry-validated pattern** — outbox is well-understood (Microservices.io, Confluent, pg-boss, Inngest); Kafka contract is the de-facto standard for event streaming.
- **AI-introspectable saga state** — `platform.saga_instances` is plain Postgres; AI agents (D-17 / D-23 / future D-22) can read state for upgrade-readiness analysis.
- **D-44's 9-step provisioning saga has a working bus from MVP-1** — the kit's first saga ships ready.

### Negative / accepted tradeoffs

- **Throughput ceiling ~5-10k events/sec** for pg-outbox at single-DB scale — adopter who needs more swaps to Kafka adapter (v1) earlier.
- **Polling overhead** — 100ms poll interval means a small DB query every 100ms even when idle. Mitigation: well-indexed `platform.outbox(processed_at, created_at)`; query is cheap.
- **No external visual saga editor** at MVP-1 — Temporal has one; we don't. Mitigation: `platform.saga_instances` queryable via admin UI adapter (v1+); doctor subcommand surfaces stuck sagas.
- **Forward-only saga semantics** — no "edit a saga in flight" support. Mitigation: cancel + re-run is the only path; documented.
- **Choreography complexity grows with saga step count** — beyond ~15 steps, debug-ability suffers. Mitigation: revisit-trigger documented; orchestration upgrade (Temporal / Conductor) is the v2+ path.

### Cross-cutting

- **ADR-0006 (observability)** must surface saga state + outbox depth + DLQ count as first-class metrics.
- **ADR-0008 (AI Subsystem 1, Customer Profile Builder)** consumes events from this bus — must respect consumer-group semantics.
- **ADR-0011 (LLM Gateway)** publishes LLM-call events to the bus for cost-tracking aggregation (D-38).
- **ADR-0014 (AI-assisted upstream merge)** must understand saga state machines when simulating kit upgrades (sagas in flight at upgrade time need migration consideration).
- **ADR-0017 (status-page adapter)** subscribes to incident events on the bus.

## Implementation notes

- **`packages/event-bus/src/adapters/pg-outbox/`** — outbox writer + poller + LISTEN consumer + dedupe table.
- **`packages/event-bus/src/contracts/`** — `EventSchema`, `ConsumerSubscription`, etc. — Zod-defined and exported as both runtime values and inferred types.
- **`packages/saga/src/`** — saga base class + state machine runner + compensation registry + instance store interface.
- **`platform.outbox`** — partitioned by month for retention management; `processed_at` column indexed for poll efficiency; `created_at + partition_key` indexed for ordered consumption.
- **`platform.event_dedupe`** — TTL-pruned via daily scheduled job (forward-only).
- **`platform.event_dlq`** — surfaced in `doctor` subcommand; manual replay path: `npx @starter-saas/cli events replay --dlq-id <id>`.
- **`platform.saga_instances`** — surfaced in `doctor`; manual cancel path: `npx @starter-saas/cli sagas cancel --saga-id <id>`.

## Revisit triggers

- **Throughput ceiling hit** (pg-outbox latency or backlog growing) → migrate to Kafka adapter sooner; revisit poll interval / batch size.
- **Saga step count exceeds 15** in any single saga → consider orchestration upgrade (Temporal / Conductor adapter v2+).
- **DLQ growth pattern indicates systemic failures** → tune retry counts; add monitoring; investigate per-topic poison-pill handling.
- **Adopter request for visual saga editing** → consider Temporal adapter v1+ alongside the kafka adapter.
- **Outbox table size grows beyond N tenants × N events × 30 days** → revisit retention; consider partition-pruning strategy.
- **Kafka adapter v1 implementation reveals contract gaps** — surface and update both adapters together to maintain drop-in promise.
