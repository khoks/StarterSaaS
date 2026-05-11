import { afterEach, describe, expect, it } from "vitest";

import type { Event } from "../src/index.js";
import { InMemoryEventBus } from "../src/index.js";

interface TestPayload {
  n: number;
}

function makeEvent(n: number, partitionKey = "p", idempotencyKey = `k-${n}`): Event<TestPayload> {
  return {
    topic: "test-topic",
    partitionKey,
    idempotencyKey,
    payload: { n },
  };
}

// Helper: wait briefly for the bus's microtask + retry chain to drain.
async function flush(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("InMemoryEventBus — publish + subscribe roundtrip", () => {
  let bus: InMemoryEventBus;
  afterEach(async () => {
    await bus.shutdown();
  });

  it("delivers a published event to a matching subscriber", async () => {
    bus = new InMemoryEventBus();
    const received: number[] = [];
    bus.subscribe<TestPayload>(
      "test-topic",
      { consumerGroup: "g1" },
      async (e) => {
        received.push(e.payload.n);
      },
    );
    await bus.publish(makeEvent(1));
    await flush();
    expect(received).toEqual([1]);
  });

  it("stamps emittedAt when publisher omits it", async () => {
    bus = new InMemoryEventBus();
    let captured: Event<TestPayload> | null = null;
    bus.subscribe<TestPayload>("test-topic", { consumerGroup: "g1" }, async (e) => {
      captured = e;
    });
    await bus.publish(makeEvent(1));
    await flush();
    expect(captured!.emittedAt).toBeInstanceOf(Date);
  });

  it("does NOT deliver to subscribers of other topics", async () => {
    bus = new InMemoryEventBus();
    const received: number[] = [];
    bus.subscribe<TestPayload>(
      "OTHER-topic",
      { consumerGroup: "g1" },
      async (e) => {
        received.push(e.payload.n);
      },
    );
    await bus.publish(makeEvent(1));
    await flush();
    expect(received).toEqual([]);
  });
});

describe("InMemoryEventBus — consumer groups", () => {
  let bus: InMemoryEventBus;
  afterEach(async () => {
    await bus.shutdown();
  });

  it("delivers each event ONCE per consumer group (load balanced within)", async () => {
    bus = new InMemoryEventBus();
    const groupAReceived: number[] = [];
    const groupBReceived: number[] = [];
    bus.subscribe<TestPayload>("test-topic", { consumerGroup: "a" }, async (e) => {
      groupAReceived.push(e.payload.n);
    });
    bus.subscribe<TestPayload>("test-topic", { consumerGroup: "b" }, async (e) => {
      groupBReceived.push(e.payload.n);
    });
    await bus.publish(makeEvent(1));
    await flush();
    expect(groupAReceived).toEqual([1]);
    expect(groupBReceived).toEqual([1]);
  });

  it("load balances round-robin within a consumer group", async () => {
    bus = new InMemoryEventBus();
    const subscriberASees: number[] = [];
    const subscriberBSees: number[] = [];
    bus.subscribe<TestPayload>("test-topic", { consumerGroup: "shared" }, async (e) => {
      subscriberASees.push(e.payload.n);
    });
    bus.subscribe<TestPayload>("test-topic", { consumerGroup: "shared" }, async (e) => {
      subscriberBSees.push(e.payload.n);
    });
    for (let i = 0; i < 4; i++) {
      await bus.publish(makeEvent(i, `partition-${i}`));
    }
    await flush();
    // Total delivered across both subscribers equals total published.
    expect(subscriberASees.length + subscriberBSees.length).toBe(4);
    // Each subscriber gets roughly half (exactly half with 4 events, round-robin).
    expect(subscriberASees.length).toBe(2);
    expect(subscriberBSees.length).toBe(2);
  });
});

describe("InMemoryEventBus — per-partition ordering", () => {
  let bus: InMemoryEventBus;
  afterEach(async () => {
    await bus.shutdown();
  });

  it("preserves order for events sharing a partitionKey within a consumer group", async () => {
    bus = new InMemoryEventBus();
    const received: number[] = [];
    bus.subscribe<TestPayload>(
      "test-topic",
      { consumerGroup: "g1", retryDelayMs: 1 },
      async (e) => {
        // Add a small async pause so out-of-order delivery would be visible.
        await new Promise((r) => setTimeout(r, e.payload.n === 1 ? 10 : 1));
        received.push(e.payload.n);
      },
    );
    await bus.publish(makeEvent(1, "saga-1"));
    await bus.publish(makeEvent(2, "saga-1"));
    await bus.publish(makeEvent(3, "saga-1"));
    await flush(100);
    expect(received).toEqual([1, 2, 3]);
  });
});

describe("InMemoryEventBus — retry + DLQ", () => {
  let bus: InMemoryEventBus;
  afterEach(async () => {
    await bus.shutdown();
  });

  it("retries up to maxRetries, then routes to DLQ", async () => {
    bus = new InMemoryEventBus();
    let attempts = 0;
    bus.subscribe<TestPayload>(
      "test-topic",
      { consumerGroup: "g1", maxRetries: 3, retryDelayMs: 1 },
      async () => {
        attempts++;
        throw new Error("simulated handler failure");
      },
    );
    await bus.publish(makeEvent(99));
    await flush(100);
    expect(attempts).toBe(3);
    const dlq = bus.deadLetterQueue();
    expect(dlq).toHaveLength(1);
    expect(dlq[0]!.attempts).toBe(3);
    expect(dlq[0]!.lastError).toContain("simulated handler failure");
    expect(dlq[0]!.event.payload).toEqual({ n: 99 });
  });

  it("does NOT route to DLQ if a retry succeeds", async () => {
    bus = new InMemoryEventBus();
    let attempts = 0;
    bus.subscribe<TestPayload>(
      "test-topic",
      { consumerGroup: "g1", maxRetries: 3, retryDelayMs: 1 },
      async () => {
        attempts++;
        if (attempts < 2) throw new Error("flaky");
      },
    );
    await bus.publish(makeEvent(1));
    await flush(50);
    expect(attempts).toBe(2);
    expect(bus.deadLetterQueue()).toHaveLength(0);
  });
});

describe("InMemoryEventBus — unsubscribe + shutdown", () => {
  it("unsubscribe removes the handler", async () => {
    const bus = new InMemoryEventBus();
    const received: number[] = [];
    const sub = bus.subscribe<TestPayload>(
      "test-topic",
      { consumerGroup: "g1" },
      async (e) => {
        received.push(e.payload.n);
      },
    );
    sub.unsubscribe();
    await bus.publish(makeEvent(1));
    await flush();
    expect(received).toEqual([]);
    await bus.shutdown();
  });

  it("publish after shutdown throws", async () => {
    const bus = new InMemoryEventBus();
    await bus.shutdown();
    await expect(bus.publish(makeEvent(1))).rejects.toThrow(/shutdown/i);
  });
});
