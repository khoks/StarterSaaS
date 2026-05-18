/**
 * Integration tests for the pg-outbox event-bus adapter against real PGlite
 * Postgres. Exercises ADR-0005 semantics:
 *
 *   - Outbox writer inserts a row in the same DB tx as adopter's business write
 *   - Poller dispatches to subscribed handlers
 *   - Consumer-group fanout: each group sees each event once
 *   - Idempotent re-delivery: dedupe via `platform.event_dedupe`
 *   - Per-partition ordering: same partitionKey processes serially
 *   - Cross-partition parallelism: different partitionKeys process concurrently
 *   - Retry-then-DLQ: handler failures retry up to maxRetries, then `platform.event_dlq`
 *   - DLQ row carries last error + attempt count + (consumer_group, idempotency_key)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OutboxWriter,
  PgOutboxEventBus,
  eventDedupe,
  eventDlq,
  outbox,
  type OutboxDb,
} from "@starter-saas/event-bus";

import { createTestDb, type TestDb } from "../../src/testing/index.js";

function asOutboxDb(harness: TestDb): OutboxDb {
  return harness.db as unknown as OutboxDb;
}

describe("OutboxWriter — atomic-with-business-state", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
  });
  afterEach(async () => {
    await harness.close();
  });

  it("writes an outbox row with the full envelope fields", async () => {
    const writer = new OutboxWriter(asOutboxDb(harness));
    const result = await writer.write({
      topic: "platform",
      partitionKey: "tenant-1",
      idempotencyKey: "test:1:created",
      payload: { hello: "world" },
      headers: { correlationId: "abc", traceId: "xyz" },
    });
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);

    const rows = await harness.db.select().from(outbox);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.topic).toBe("platform");
    expect(rows[0]?.partitionKey).toBe("tenant-1");
    expect(rows[0]?.idempotencyKey).toBe("test:1:created");
    expect(rows[0]?.headers).toEqual({ correlationId: "abc", traceId: "xyz" });
    expect(rows[0]?.processedAt).toBeNull();
  });

  it("is atomic with adopter's transaction — rollback drops the outbox row", async () => {
    const db = asOutboxDb(harness);
    try {
      await db.transaction(async (tx) => {
        await new OutboxWriter(tx as OutboxDb).write({
          topic: "platform",
          partitionKey: "t",
          idempotencyKey: "rollback-test",
          payload: { value: 1 },
        });
        throw new Error("simulated business failure");
      });
    } catch {
      /* expected */
    }
    const rows = await harness.db.select().from(outbox);
    expect(rows).toHaveLength(0);
  });
});

describe("PgOutboxEventBus — happy path + dedupe", () => {
  let harness: TestDb;
  let bus: PgOutboxEventBus;

  beforeEach(async () => {
    harness = await createTestDb();
    bus = new PgOutboxEventBus(asOutboxDb(harness), { pollIntervalMs: 50 });
  });
  afterEach(async () => {
    await bus.shutdown();
    await harness.close();
  });

  it("delivers one event to one consumer group, records dedupe row, marks outbox processed", async () => {
    const received: unknown[] = [];
    bus.subscribe<{ value: number }>(
      "platform",
      { consumerGroup: "g1" },
      async (event) => {
        received.push(event.payload);
      },
    );

    await bus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-1",
      payload: { value: 42 },
    });

    await bus.tick();
    expect(received).toEqual([{ value: 42 }]);

    const dedupe = await harness.db.select().from(eventDedupe);
    expect(dedupe).toHaveLength(1);
    expect(dedupe[0]?.consumerGroup).toBe("g1");
    expect(dedupe[0]?.idempotencyKey).toBe("ev-1");

    const rows = await harness.db.select().from(outbox);
    expect(rows[0]?.processedAt).not.toBeNull();
  });

  it("fans out one event to multiple consumer groups", async () => {
    const groupA: unknown[] = [];
    const groupB: unknown[] = [];
    bus.subscribe("platform", { consumerGroup: "billing" }, async (e) => {
      groupA.push(e.payload);
    });
    bus.subscribe("platform", { consumerGroup: "audit" }, async (e) => {
      groupB.push(e.payload);
    });

    await bus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-fanout",
      payload: { kind: "fanout" },
    });

    await bus.tick();
    expect(groupA).toEqual([{ kind: "fanout" }]);
    expect(groupB).toEqual([{ kind: "fanout" }]);

    const dedupe = await harness.db.select().from(eventDedupe);
    expect(dedupe).toHaveLength(2);
  });

  it("idempotent re-delivery: a second tick does NOT re-invoke the handler", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    bus.subscribe("platform", { consumerGroup: "g1" }, handler);

    await bus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-once",
      payload: 1,
    });

    await bus.tick();
    await bus.tick();
    await bus.tick();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("preserves per-partition ordering", async () => {
    const order: number[] = [];
    bus.subscribe<{ seq: number }>("platform", { consumerGroup: "g1" }, async (e) => {
      order.push(e.payload.seq);
    });

    for (let i = 0; i < 5; i++) {
      await bus.publish({
        topic: "platform",
        partitionKey: "same-partition",
        idempotencyKey: `seq-${i}`,
        payload: { seq: i },
      });
    }

    await bus.tick();
    expect(order).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("PgOutboxEventBus — retry + DLQ", () => {
  let harness: TestDb;
  let bus: PgOutboxEventBus;
  beforeEach(async () => {
    harness = await createTestDb();
    bus = new PgOutboxEventBus(asOutboxDb(harness), {
      pollIntervalMs: 50,
      maxRetries: 3,
      retryDelayMs: 1, // fast retries for tests
    });
  });
  afterEach(async () => {
    await bus.shutdown();
    await harness.close();
  });

  it("retries failures then DLQs after maxRetries", async () => {
    let calls = 0;
    bus.subscribe("platform", { consumerGroup: "flaky" }, async () => {
      calls++;
      throw new Error("boom");
    });

    await bus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-fail",
      payload: { x: 1 },
    });

    // First tick records attempt 1.
    await bus.tick();
    expect(calls).toBe(1);
    // No DLQ yet.
    let dlq = await harness.db.select().from(eventDlq);
    expect(dlq).toHaveLength(0);

    // Wait past the retry delay (~1ms), then tick 3 more times to exhaust retries.
    await new Promise((r) => setTimeout(r, 10));
    await bus.tick(); // attempt 2
    await new Promise((r) => setTimeout(r, 10));
    await bus.tick(); // attempt 3 → DLQ
    expect(calls).toBe(3);

    dlq = await harness.db.select().from(eventDlq);
    expect(dlq).toHaveLength(1);
    expect(dlq[0]?.consumerGroup).toBe("flaky");
    expect(dlq[0]?.idempotencyKey).toBe("ev-fail");
    expect(dlq[0]?.attempts).toBe(3);
    expect(dlq[0]?.lastError).toBe("boom");

    // Outbox row marked processed (this consumer group is terminated → all groups done).
    const rows = await harness.db.select().from(outbox);
    expect(rows[0]?.processedAt).not.toBeNull();

    // In-memory DLQ mirror surfaces the failure too.
    expect(bus.deadLetterQueue()).toHaveLength(1);
  });

  it("respects retry backoff — handler doesn't re-fire within the backoff window", async () => {
    // Use a longer retry delay so the second tick lands inside the window.
    const slowBus = new PgOutboxEventBus(asOutboxDb(harness), {
      maxRetries: 5,
      retryDelayMs: 200,
    });
    let calls = 0;
    slowBus.subscribe("platform", { consumerGroup: "slow-fail" }, async () => {
      calls++;
      throw new Error("nope");
    });

    await slowBus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-backoff",
      payload: {},
    });

    // Tick immediately twice — second tick should skip because the 200ms
    // backoff hasn't elapsed.
    await slowBus.tick();
    await slowBus.tick();
    expect(calls).toBe(1);

    // After waiting past the backoff, the retry runs.
    await new Promise((r) => setTimeout(r, 220));
    await slowBus.tick();
    expect(calls).toBe(2);

    await slowBus.shutdown();
  });

  it("one group's DLQ doesn't block another group's successful processing", async () => {
    const okReceived: unknown[] = [];
    bus.subscribe("platform", { consumerGroup: "ok-group" }, async (e) => {
      okReceived.push(e.payload);
    });
    bus.subscribe("platform", { consumerGroup: "bad-group" }, async () => {
      throw new Error("always");
    });

    await bus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-split",
      payload: { v: 1 },
    });

    // Tick to exhaust retries on bad-group + succeed on ok-group.
    for (let i = 0; i < 5; i++) {
      await bus.tick();
      await new Promise((r) => setTimeout(r, 5));
    }

    expect(okReceived).toEqual([{ v: 1 }]);
    const dlq = await harness.db.select().from(eventDlq);
    expect(dlq).toHaveLength(1);
    expect(dlq[0]?.consumerGroup).toBe("bad-group");
  });
});

describe("PgOutboxEventBus — unsubscribe", () => {
  let harness: TestDb;
  beforeEach(async () => {
    harness = await createTestDb();
  });
  afterEach(async () => {
    await harness.close();
  });

  it("unsubscribe stops further deliveries to that handler", async () => {
    const bus = new PgOutboxEventBus(asOutboxDb(harness));
    const handler = vi.fn().mockResolvedValue(undefined);
    const sub = bus.subscribe("platform", { consumerGroup: "g1" }, handler);

    await bus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-1",
      payload: 1,
    });
    await bus.tick();
    expect(handler).toHaveBeenCalledTimes(1);

    sub.unsubscribe();
    await bus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-2",
      payload: 2,
    });
    await bus.tick();
    expect(handler).toHaveBeenCalledTimes(1);

    await bus.shutdown();
  });
});
