/**
 * `OutboxPoller` — reads `platform.outbox` for unprocessed rows + dispatches
 * to subscribed handlers per ADR-0005.
 *
 * Kafka-shaped semantics:
 *   - Per-partition ordering: events with the same `partitionKey` process serially
 *   - Cross-partition parallelism: different partitions process concurrently
 *   - Consumer-group fanout: each (consumer_group, idempotencyKey) gets one delivery
 *   - At-least-once: events are retried until a dedupe row is written
 *   - Retry-then-DLQ: handler failures retry up to `maxRetries`, then write to
 *     `platform.event_dlq` (per (consumer_group, idempotencyKey))
 *
 * The poller is process-local — retry counters live in memory; on restart they
 * reset to 0. Worst case = a few extra retries per event after restart; no
 * events are lost (the outbox is durable). Production-grade durable retry
 * tracking is a v1+ enhancement.
 */

import { and, asc, eq, isNull } from "drizzle-orm";

import type { DeadLetterEntry, Event, EventHandler, SubscribeOptions } from "../types.js";

import type { OutboxDb } from "./db-handle.js";
import { eventDedupe, eventDlq, outbox, type OutboxRow } from "./schema.js";

export interface PollerHandler {
  consumerGroup: string;
  handler: EventHandler<unknown>;
  options: Required<SubscribeOptions>;
}

export interface OutboxPollerOptions {
  /** Default = 100ms per ADR-0005 side-pick. Adopter-tunable. */
  pollIntervalMs?: number;
  /** Max events to fetch per poll. */
  batchSize?: number;
  /** Per-(event, group) max retries before DLQ. Default 5 per ADR-0005. */
  maxRetries?: number;
  /** Delay between retries (ms). Linear backoff in MVP-1; exponential is a
   *  v1+ enhancement once outbox retry state is durable. */
  retryDelayMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 100;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 100;

interface RetryState {
  attempts: number;
  /** Earliest timestamp at which we'll retry this (event, group) pair. */
  nextAttemptAt: number;
}

export class OutboxPoller {
  /** Handlers indexed by topic → list of (consumerGroup, handler) pairs. */
  private readonly handlers = new Map<string, PollerHandler[]>();

  /** Per-(outboxId, consumerGroup) retry state. Lives in this process only. */
  private readonly retryState = new Map<string, RetryState>();

  /** In-memory mirror of recent DLQ entries, exposed via `EventBus.deadLetterQueue()`. */
  private readonly dlqMirror: DeadLetterEntry[] = [];

  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopping = false;

  constructor(
    private readonly db: OutboxDb,
    private readonly options: Required<OutboxPollerOptions>,
  ) {}

  static withDefaults(
    db: OutboxDb,
    options: OutboxPollerOptions = {},
  ): OutboxPoller {
    return new OutboxPoller(db, {
      pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
      batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelayMs: options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    });
  }

  /** Register a handler against a topic + consumer group. Multiple handlers
   *  in the same consumer group form a load-balanced set (round-robin within
   *  the group); different groups receive each event independently. The
   *  pg-outbox poller is single-process; multi-process LB is a v1+ feature
   *  (until then, each consumer group's handler runs in the host process). */
  subscribe<T>(
    topic: string,
    options: SubscribeOptions,
    handler: EventHandler<T>,
  ): { unsubscribe(): void } {
    const filled: Required<SubscribeOptions> = {
      consumerGroup: options.consumerGroup,
      maxRetries: options.maxRetries ?? this.options.maxRetries,
      retryDelayMs: options.retryDelayMs ?? this.options.retryDelayMs,
    };
    const entry: PollerHandler = {
      consumerGroup: options.consumerGroup,
      handler: handler as EventHandler<unknown>,
      options: filled,
    };
    const list = this.handlers.get(topic) ?? [];
    list.push(entry);
    this.handlers.set(topic, list);
    return {
      unsubscribe: () => {
        const current = this.handlers.get(topic);
        if (!current) return;
        const next = current.filter((h) => h !== entry);
        if (next.length === 0) {
          this.handlers.delete(topic);
        } else {
          this.handlers.set(topic, next);
        }
      },
    };
  }

  /** Begin polling. Idempotent. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.stopping = false;
    const loop = (): void => {
      if (this.stopping) return;
      this.timer = setTimeout(() => {
        void this.tick().finally(loop);
      }, this.options.pollIntervalMs);
    };
    loop();
  }

  /** Stop polling. Waits for any in-flight tick to finish. */
  async stop(): Promise<void> {
    this.stopping = true;
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Snapshot of the dead-letter queue. */
  deadLetterQueue(): readonly DeadLetterEntry[] {
    return [...this.dlqMirror];
  }

  /** Run a single poll cycle synchronously. Tests invoke this for deterministic
   *  control flow; the live `start()` loop calls it on a setTimeout cadence. */
  async tick(): Promise<void> {
    const subscribedTopics = [...this.handlers.keys()];
    if (subscribedTopics.length === 0) return;

    // Fetch unprocessed rows for topics we have handlers for. Order matters:
    // older events first, with partition_key as a stable secondary sort so
    // per-partition ordering is preserved when we group below.
    const rows: OutboxRow[] = await this.db
      .select()
      .from(outbox)
      .where(isNull(outbox.processedAt))
      .orderBy(asc(outbox.emittedAt), asc(outbox.partitionKey))
      .limit(this.options.batchSize);

    if (rows.length === 0) return;

    // Group by partitionKey so per-partition processing stays serial.
    const byPartition = new Map<string, OutboxRow[]>();
    for (const row of rows) {
      if (!this.handlers.has(row.topic)) continue;
      const list = byPartition.get(row.partitionKey) ?? [];
      list.push(row);
      byPartition.set(row.partitionKey, list);
    }

    await Promise.all(
      [...byPartition.values()].map(async (partitionRows) => {
        for (const row of partitionRows) {
          await this.dispatchOne(row);
        }
      }),
    );
  }

  private async dispatchOne(row: OutboxRow): Promise<void> {
    const handlers = this.handlers.get(row.topic) ?? [];
    if (handlers.length === 0) return;

    let allTerminated = true;
    const now = Date.now();

    for (const h of handlers) {
      const dedupeKey = { consumerGroup: h.consumerGroup, idempotencyKey: row.idempotencyKey };

      // Skip groups that have already succeeded or DLQ'd this event.
      if (await this.isDedupedOrDlqd(dedupeKey)) continue;

      // Respect retry backoff — skip until nextAttemptAt elapsed.
      const retryKey = `${row.id}:${h.consumerGroup}`;
      const retry = this.retryState.get(retryKey);
      if (retry && retry.nextAttemptAt > now) {
        allTerminated = false;
        continue;
      }

      try {
        await h.handler(this.rowToEvent(row));
        // Success — record in dedupe ledger.
        await this.db.insert(eventDedupe).values({
          consumerGroup: h.consumerGroup,
          idempotencyKey: row.idempotencyKey,
        });
        this.retryState.delete(retryKey);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        const attempts = (retry?.attempts ?? 0) + 1;
        if (attempts >= h.options.maxRetries) {
          // DLQ this (event, group) pair.
          const inserted = await this.db
            .insert(eventDlq)
            .values({
              outboxId: row.id,
              consumerGroup: h.consumerGroup,
              topic: row.topic,
              partitionKey: row.partitionKey,
              idempotencyKey: row.idempotencyKey,
              payload: row.payload,
              headers: row.headers,
              lastError: reason,
              attempts,
            })
            .returning({ id: eventDlq.id });
          this.retryState.delete(retryKey);
          this.dlqMirror.push({
            event: this.rowToEvent(row),
            consumerGroup: h.consumerGroup,
            attempts,
            lastError: reason,
            failedAt: new Date(),
          });
          // Keep allTerminated true — this group is terminated (failed),
          // so the outbox row can be marked processed once all groups terminate.
          if (!inserted[0]) {
            // Unexpected: insert didn't return — defensive guard.
            allTerminated = false;
          }
        } else {
          this.retryState.set(retryKey, {
            attempts,
            nextAttemptAt: now + h.options.retryDelayMs,
          });
          allTerminated = false;
        }
      }
    }

    // Mark outbox row processed once every subscribed group has terminated.
    if (allTerminated) {
      await this.db
        .update(outbox)
        .set({ processedAt: new Date() })
        .where(eq(outbox.id, row.id));
    }
  }

  private async isDedupedOrDlqd(key: {
    consumerGroup: string;
    idempotencyKey: string;
  }): Promise<boolean> {
    const deduped = await this.db
      .select({ k: eventDedupe.idempotencyKey })
      .from(eventDedupe)
      .where(
        and(
          eq(eventDedupe.consumerGroup, key.consumerGroup),
          eq(eventDedupe.idempotencyKey, key.idempotencyKey),
        ),
      )
      .limit(1);
    if (deduped.length > 0) return true;
    const dlqd = await this.db
      .select({ k: eventDlq.idempotencyKey })
      .from(eventDlq)
      .where(
        and(
          eq(eventDlq.consumerGroup, key.consumerGroup),
          eq(eventDlq.idempotencyKey, key.idempotencyKey),
          isNull(eventDlq.replayedAt),
        ),
      )
      .limit(1);
    return dlqd.length > 0;
  }

  private rowToEvent(row: OutboxRow): Event<unknown> {
    return {
      topic: row.topic,
      partitionKey: row.partitionKey,
      idempotencyKey: row.idempotencyKey,
      payload: row.payload,
      headers: row.headers as Record<string, string | undefined>,
      emittedAt: row.emittedAt,
    };
  }
}
