/**
 * In-memory event bus — implements `EventBus` for tests + in-process saga
 * execution. Preserves Kafka-shaped semantics: per-partition ordering,
 * consumer-group load balancing, at-least-once delivery with retry, DLQ on
 * exhausted retries.
 *
 * This is NOT for production use. The pg-outbox adapter (STORY-017) is the
 * MVP-1 production default; the native Kafka adapter is the v1 target.
 */

import type {
  DeadLetterEntry,
  Event,
  EventBus,
  EventHandler,
  SubscribeOptions,
  Subscription,
} from "./types.js";

interface RegisteredHandler<T = unknown> {
  consumerGroup: string;
  handler: EventHandler<T>;
  options: Required<SubscribeOptions>;
  /** Stable id so unsubscribe() can find this row. */
  id: number;
}

interface PartitionState {
  /** Tail of the FIFO queue per (topic, partitionKey, consumerGroup) tuple —
   *  preserves per-partition ordering inside a group. */
  pending: Promise<void>;
}

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 100;

export class InMemoryEventBus implements EventBus {
  private readonly handlersByTopic = new Map<string, RegisteredHandler<unknown>[]>();
  private readonly partitionStates = new Map<string, PartitionState>();
  private readonly dlq: DeadLetterEntry[] = [];
  private nextHandlerId = 0;
  private shuttingDown = false;
  /** Tracks all in-flight delivery promises so `shutdown()` can await them. */
  private inFlight = new Set<Promise<void>>();

  // ─────────── publish ───────────

  async publish<T>(event: Event<T>): Promise<void> {
    if (this.shuttingDown) {
      throw new Error("InMemoryEventBus: cannot publish after shutdown()");
    }
    const stamped: Event<T> = { ...event, emittedAt: event.emittedAt ?? new Date() };
    const handlers = this.handlersByTopic.get(stamped.topic) ?? [];

    // Group by consumer group — exactly one delivery per group, round-robin
    // among subscribers within a group.
    const byGroup = new Map<string, RegisteredHandler<unknown>[]>();
    for (const h of handlers) {
      const list = byGroup.get(h.consumerGroup) ?? [];
      list.push(h);
      byGroup.set(h.consumerGroup, list);
    }

    for (const [group, members] of byGroup) {
      const target = this.pickRoundRobin(members);
      this.scheduleDelivery(stamped, target as RegisteredHandler<T>, group);
    }
  }

  private roundRobinCursor = new Map<string, number>();

  private pickRoundRobin(members: RegisteredHandler<unknown>[]): RegisteredHandler<unknown> {
    // Stable consumer-group key — use the first member's group label
    const group = members[0]!.consumerGroup;
    const cursor = this.roundRobinCursor.get(group) ?? 0;
    const pick = members[cursor % members.length]!;
    this.roundRobinCursor.set(group, cursor + 1);
    return pick;
  }

  private scheduleDelivery<T>(
    event: Event<T>,
    target: RegisteredHandler<T>,
    consumerGroup: string,
  ): void {
    const partitionKey = `${event.topic}|${event.partitionKey}|${consumerGroup}`;
    const prev = this.partitionStates.get(partitionKey)?.pending ?? Promise.resolve();
    const next = prev
      .catch(() => {
        // Ignore errors from prior partition events — we still want to deliver this one.
      })
      .then(() => this.deliverWithRetry(event, target, consumerGroup));
    this.partitionStates.set(partitionKey, { pending: next });

    this.inFlight.add(next);
    void next.finally(() => {
      this.inFlight.delete(next);
    });
  }

  private async deliverWithRetry<T>(
    event: Event<T>,
    target: RegisteredHandler<T>,
    consumerGroup: string,
  ): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= target.options.maxRetries; attempt++) {
      try {
        await target.handler(event);
        return;
      } catch (err) {
        lastError = err;
        if (attempt < target.options.maxRetries) {
          await this.sleep(target.options.retryDelayMs);
        }
      }
    }
    this.dlq.push({
      event: event as Event<unknown>,
      consumerGroup,
      attempts: target.options.maxRetries,
      lastError: lastError instanceof Error ? lastError.message : String(lastError),
      failedAt: new Date(),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─────────── subscribe / unsubscribe ───────────

  subscribe<T>(
    topic: string,
    options: SubscribeOptions,
    handler: EventHandler<T>,
  ): Subscription {
    const id = this.nextHandlerId++;
    const merged: Required<SubscribeOptions> = {
      consumerGroup: options.consumerGroup,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelayMs: options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    };
    const list = this.handlersByTopic.get(topic) ?? [];
    list.push({
      consumerGroup: merged.consumerGroup,
      handler: handler as EventHandler<unknown>,
      options: merged,
      id,
    });
    this.handlersByTopic.set(topic, list);

    return {
      unsubscribe: () => {
        const current = this.handlersByTopic.get(topic) ?? [];
        this.handlersByTopic.set(
          topic,
          current.filter((h) => h.id !== id),
        );
      },
    };
  }

  // ─────────── dlq + shutdown ───────────

  deadLetterQueue(): readonly DeadLetterEntry[] {
    return this.dlq;
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    // Wait for all in-flight deliveries to drain before clearing state.
    await Promise.all([...this.inFlight].map((p) => p.catch(() => undefined)));
    this.handlersByTopic.clear();
    this.partitionStates.clear();
    this.roundRobinCursor.clear();
  }
}
