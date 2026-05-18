/**
 * Integration tests for `replayDlqEntry` + `listDlqEntries` against PGlite.
 *
 * Covers the manual replay flow per ADR-0005:
 *   - Replay re-publishes the event through the bus
 *   - Replayed events trigger normal poller dispatch + dedupe semantics
 *   - DLQ row marked `replayed_at = now()` after success
 *   - Refuses already-replayed entries
 *   - Refuses non-existent entries
 *   - listDlqEntries excludes replayed by default + includes-replayed opt-in
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  PgOutboxEventBus,
  eventDedupe,
  eventDlq,
  listDlqEntries,
  outbox,
  replayDlqEntry,
  type OutboxDb,
} from "@starter-saas/event-bus";

import { createTestDb, type TestDb } from "../../src/testing/index.js";

function asOutboxDb(harness: TestDb): OutboxDb {
  return harness.db as unknown as OutboxDb;
}

describe("replayDlqEntry — happy path", () => {
  let harness: TestDb;
  let bus: PgOutboxEventBus;
  beforeEach(async () => {
    harness = await createTestDb();
    bus = new PgOutboxEventBus(asOutboxDb(harness), {
      maxRetries: 1, // force fast DLQ for tests
      retryDelayMs: 1,
    });
  });
  afterEach(async () => {
    await bus.shutdown();
    await harness.close();
  });

  it("re-publishes a DLQ entry; on retry the (now-healthy) handler succeeds", async () => {
    let failOnce = true;
    const received: unknown[] = [];
    bus.subscribe<{ value: number }>("platform", { consumerGroup: "g1" }, async (event) => {
      if (failOnce) {
        failOnce = false;
        throw new Error("transient");
      }
      received.push(event.payload);
    });

    await bus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-replay",
      payload: { value: 1 },
    });

    // Tick to fail it into the DLQ.
    await bus.tick();
    let dlq = await harness.db.select().from(eventDlq);
    expect(dlq).toHaveLength(1);

    // Replay — the handler is now healthy + accepts the event.
    const replayResult = await replayDlqEntry(asOutboxDb(harness), bus, dlq[0]!.id);
    expect(replayResult.ok).toBe(true);

    // The DLQ row has replayed_at stamped.
    dlq = await harness.db.select().from(eventDlq);
    expect(dlq[0]?.replayedAt).not.toBeNull();

    // The poller picks up the new outbox row + delivers.
    await bus.tick();
    expect(received).toEqual([{ value: 1 }]);

    // Dedupe row written for the successful retry.
    const ded = await harness.db.select().from(eventDedupe);
    expect(ded).toHaveLength(1);
  });

  it("inserts a NEW outbox row on replay (original outbox row stays processed)", async () => {
    bus.subscribe("platform", { consumerGroup: "g1" }, async () => {
      throw new Error("perma-fail");
    });

    await bus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-fresh-outbox",
      payload: { v: 1 },
    });
    await bus.tick();

    const outboxBefore = await harness.db.select().from(outbox);
    expect(outboxBefore).toHaveLength(1);
    expect(outboxBefore[0]?.processedAt).not.toBeNull();

    const dlq = await harness.db.select().from(eventDlq);
    await replayDlqEntry(asOutboxDb(harness), bus, dlq[0]!.id);

    const outboxAfter = await harness.db.select().from(outbox);
    expect(outboxAfter).toHaveLength(2);
    // The new row is unprocessed.
    const fresh = outboxAfter.find((r) => r.processedAt === null);
    expect(fresh).toBeDefined();
    expect(fresh?.idempotencyKey).toBe("ev-fresh-outbox");
  });

  it("refuses to replay an already-replayed entry", async () => {
    bus.subscribe("platform", { consumerGroup: "g1" }, async () => {
      throw new Error("fail");
    });
    await bus.publish({
      topic: "platform",
      partitionKey: "t",
      idempotencyKey: "ev-once",
      payload: {},
    });
    await bus.tick();

    const dlq = await harness.db.select().from(eventDlq);
    const first = await replayDlqEntry(asOutboxDb(harness), bus, dlq[0]!.id);
    expect(first.ok).toBe(true);

    const second = await replayDlqEntry(asOutboxDb(harness), bus, dlq[0]!.id);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("already-replayed");
  });

  it("returns not-found for unknown DLQ ID", async () => {
    const result = await replayDlqEntry(
      asOutboxDb(harness),
      bus,
      "00000000-0000-7000-8000-deadbeefdead",
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not-found");
  });
});

describe("listDlqEntries", () => {
  let harness: TestDb;
  let bus: PgOutboxEventBus;
  beforeEach(async () => {
    harness = await createTestDb();
    bus = new PgOutboxEventBus(asOutboxDb(harness), {
      maxRetries: 1,
      retryDelayMs: 1,
    });
  });
  afterEach(async () => {
    await bus.shutdown();
    await harness.close();
  });

  it("excludes replayed entries by default; includes them with includeReplayed=true", async () => {
    bus.subscribe("platform", { consumerGroup: "g1" }, async () => {
      throw new Error("fail");
    });
    // Generate two DLQ rows.
    await bus.publish({ topic: "platform", partitionKey: "t", idempotencyKey: "e1", payload: 1 });
    await bus.publish({ topic: "platform", partitionKey: "t", idempotencyKey: "e2", payload: 2 });
    await bus.tick();

    const allDlq = await harness.db.select().from(eventDlq);
    expect(allDlq).toHaveLength(2);

    // Mark one as replayed.
    await replayDlqEntry(asOutboxDb(harness), bus, allDlq[0]!.id);

    const active = await listDlqEntries(asOutboxDb(harness));
    expect(active).toHaveLength(1);

    const all = await listDlqEntries(asOutboxDb(harness), { includeReplayed: true });
    expect(all).toHaveLength(2);
  });
});
