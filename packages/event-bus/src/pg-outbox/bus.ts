/**
 * `PgOutboxEventBus` — production `EventBus` adapter implementing Kafka-shaped
 * semantics over Postgres NOTIFY + outbox table per ADR-0005 (D-45).
 *
 * Two publishing paths:
 *   - `bus.publish(event)` — writes to outbox via the bus's own db handle.
 *     Sufficient for fire-and-forget cases; NOT atomic with adopter's tx.
 *   - `new OutboxWriter(tx).write(event)` — adopter-tx-aware. Atomic with the
 *     business INSERT inside the adopter's transaction — solves the dual-write
 *     problem per ADR-0005.
 *
 * Consumption: `bus.subscribe(topic, options, handler)` registers an in-process
 * handler the `OutboxPoller` invokes once per (event, consumer_group) pair.
 *
 * MVP-1 limitations vs. ADR-0005:
 *   - No pg_notify wakeup yet — poller relies solely on the 100ms poll interval.
 *     pg_notify is a wake-up optimization; adding it later is a perf upgrade,
 *     not a contract change. (pglite doesn't support cross-connection LISTEN/NOTIFY
 *     anyway, so tests can't exercise it.)
 *   - Retry counter lives in memory per process — restart resets it. Worst case
 *     = a few extra retries on restart; no events lost (outbox is durable).
 *     Durable retry tracking is a v1+ enhancement.
 *   - Single-process consumer group LB — each handler runs in the host process.
 *     Multi-process LB is a v1+ feature (atomic claim via row-level locking).
 */

import type {
  DeadLetterEntry,
  Event,
  EventBus,
  EventHandler,
  SubscribeOptions,
  Subscription,
} from "../types.js";

import type { OutboxDb } from "./db-handle.js";
import { OutboxPoller, type OutboxPollerOptions } from "./poller.js";
import { OutboxWriter } from "./writer.js";

export interface PgOutboxEventBusOptions extends OutboxPollerOptions {}

export class PgOutboxEventBus implements EventBus {
  private readonly writer: OutboxWriter;
  private readonly poller: OutboxPoller;

  constructor(db: OutboxDb, options: PgOutboxEventBusOptions = {}) {
    this.writer = new OutboxWriter(db);
    this.poller = OutboxPoller.withDefaults(db, options);
  }

  /** Begin polling for outbox events. Idempotent. Adopter typically calls this
   *  once at process boot, after registering subscriptions. */
  start(): void {
    this.poller.start();
  }

  /** Run a single poll cycle. Useful in tests + for adopter-controlled
   *  pacing (e.g. one tick per request in a worker process). */
  async tick(): Promise<void> {
    await this.poller.tick();
  }

  async publish<T>(event: Event<T>): Promise<void> {
    await this.writer.write(event);
  }

  subscribe<T>(
    topic: string,
    options: SubscribeOptions,
    handler: EventHandler<T>,
  ): Subscription {
    return this.poller.subscribe(topic, options, handler);
  }

  deadLetterQueue(): readonly DeadLetterEntry[] {
    return this.poller.deadLetterQueue();
  }

  async shutdown(): Promise<void> {
    await this.poller.stop();
  }
}
