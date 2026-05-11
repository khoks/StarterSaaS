/**
 * Event bus contract types — Kafka-shaped from day 1 (per D-45 / ADR-0005).
 *
 * The pg-outbox adapter (MVP-1 default — STORY-017) implements Kafka semantics
 * over Postgres NOTIFY + outbox table. The v1 target is a native Kafka adapter
 * which is a drop-in swap — adopter code doesn't change.
 *
 * In this package (sub-PR #1 of STORY-014) we ship:
 *   - The Kafka-shaped types here
 *   - InMemoryEventBus (./in-memory.ts) for tests + in-process saga execution
 *
 * The pg-outbox + native Kafka adapters land in STORY-017 with the same
 * `EventBus` interface — same contract, different mechanism.
 */

import { z } from "zod";

/** Event payload envelope passed across the bus. Generic over the payload type. */
export interface Event<T = unknown> {
  /** Topic name — `tenant_{uuid}` for tenant-scoped, `platform` for cross-tenant. */
  topic: string;
  /** Partition key — events with the same partition_key are processed in order
   *  (Kafka guarantee). Default conventions: `saga_id` for saga events,
   *  `tenant_id` for tenant-scoped events. */
  partitionKey: string;
  /** Idempotency key — consumers dedupe via `(consumer_group, idempotency_key)`
   *  with a TTL (default 30 days per ADR-0005). Recommended format:
   *  `{producer_name}:{business_id}:{action}`. */
  idempotencyKey: string;
  /** Application payload. Adopter-defined; typed via generics. */
  payload: T;
  /** Optional headers — correlation_id / trace_id / saga_id flow through for
   *  observability + saga ordering. Adopter can attach arbitrary string headers. */
  headers?: EventHeaders;
  /** Populated by the bus on publish. Adopter typically doesn't set this. */
  emittedAt?: Date;
}

export interface EventHeaders {
  correlationId?: string;
  traceId?: string;
  sagaId?: string;
  [k: string]: string | undefined;
}

export type EventHandler<T> = (event: Event<T>) => Promise<void>;

export interface Subscription {
  /** Stop receiving events on this subscription. Already-delivered events
   *  continue processing. */
  unsubscribe(): void;
}

export interface SubscribeOptions {
  /** Consumer group name — events are delivered once per group (Kafka
   *  consumer-group semantics). Multiple subscribers in the same group form
   *  a load-balanced consumer set; different groups receive independently. */
  consumerGroup: string;
  /** Max retry attempts before routing to the dead-letter queue. Default 5
   *  per ADR-0005 D-45. */
  maxRetries?: number;
  /** Delay (ms) between retries. Real adapters use exponential backoff;
   *  in-memory adapter uses linear default. Default 100ms. */
  retryDelayMs?: number;
}

export interface EventBus {
  /** Publish an event to a topic. Bus assigns `emittedAt` if not set. */
  publish<T>(event: Event<T>): Promise<void>;

  /** Subscribe to a topic. Multiple subscribers in the same `consumerGroup`
   *  load-balance the delivery (one of them gets each event). Subscribers in
   *  DIFFERENT consumer groups all receive each event. */
  subscribe<T>(
    topic: string,
    options: SubscribeOptions,
    handler: EventHandler<T>,
  ): Subscription;

  /** Read events that have exceeded retry attempts. Adopter-facing for the
   *  DLQ replay tool (CLI subcommand `events replay` from ADR-0018). */
  deadLetterQueue(): readonly DeadLetterEntry[];

  /** Stop the bus + clear all subscriptions. Used in test teardown. */
  shutdown(): Promise<void>;
}

export interface DeadLetterEntry {
  event: Event<unknown>;
  consumerGroup: string;
  attempts: number;
  lastError: string;
  failedAt: Date;
}

/** Zod schema for runtime validation of event envelopes — adopter can use this
 *  at the publish boundary to validate untrusted producers (e.g. HTTP webhooks
 *  delivering external events). */
export const EventSchema = z.object({
  topic: z.string().min(1),
  partitionKey: z.string().min(1),
  idempotencyKey: z.string().min(1),
  payload: z.unknown(),
  headers: z
    .object({
      correlationId: z.string().optional(),
      traceId: z.string().optional(),
      sagaId: z.string().optional(),
    })
    .catchall(z.string().optional())
    .optional(),
  emittedAt: z.date().optional(),
});
