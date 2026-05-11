import { describe, expect, it } from "vitest";

import {
  InMemorySagaStore,
  SagaRunner,
  type SagaDefinition,
} from "../src/index.js";

interface CounterState {
  log: string[];
}

function makeSaga(opts: {
  fail?: string;
  failCompensate?: string;
}): SagaDefinition<CounterState> {
  const stepNames = ["a", "b", "c", "d"];
  return {
    name: "test-saga",
    steps: stepNames.map((name) => ({
      name,
      // eslint-disable-next-line @typescript-eslint/require-await
      execute: async (s) => {
        if (opts.fail === name) {
          throw new Error(`execute-failed:${name}`);
        }
        return { log: [...s.log, `exec:${name}`] };
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      compensate: async (s) => {
        if (opts.failCompensate === name) {
          throw new Error(`compensate-failed:${name}`);
        }
        s.log.push(`comp:${name}`);
      },
    })),
  };
}

describe("SagaRunner — happy path", () => {
  it("runs all steps and returns ok=true with completed step names in order", async () => {
    const store = new InMemorySagaStore();
    const runner = new SagaRunner(store);
    const result = await runner.run(makeSaga({}), { log: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return; // type guard
    expect(result.completedSteps).toEqual(["a", "b", "c", "d"]);
    expect(result.finalState.log).toEqual(["exec:a", "exec:b", "exec:c", "exec:d"]);
  });

  it("persists status: completed in the store after success", async () => {
    const store = new InMemorySagaStore();
    const runner = new SagaRunner(store);
    const result = await runner.run(makeSaga({}), { log: [] });
    const instance = await store.get(result.instanceId);
    expect(instance?.status).toBe("completed");
    expect(instance?.completedSteps).toEqual(["a", "b", "c", "d"]);
    expect(instance?.currentStep).toBe(4);
  });
});

describe("SagaRunner — mid-saga failure with full compensation", () => {
  it("walks compensations in REVERSE order after step c fails", async () => {
    const store = new InMemorySagaStore();
    const runner = new SagaRunner(store);
    const result = await runner.run(makeSaga({ fail: "c" }), { log: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failedStep).toBe("c");
    expect(result.reason).toContain("execute-failed:c");
    // Compensations run for already-completed steps in reverse: b, then a.
    expect(result.compensatedSteps).toEqual(["b", "a"]);
    expect(result.finalStatus).toBe("compensated");
  });

  it("persists status: compensated + compensatedSteps array", async () => {
    const store = new InMemorySagaStore();
    const runner = new SagaRunner(store);
    const result = await runner.run(makeSaga({ fail: "c" }), { log: [] });
    const instance = await store.get(result.instanceId);
    expect(instance?.status).toBe("compensated");
    expect(instance?.compensatedSteps).toEqual(["b", "a"]);
    expect(instance?.failureReason).toContain("execute-failed:c");
  });

  it("the first step failing produces compensatedSteps: [] (nothing yet committed)", async () => {
    const store = new InMemorySagaStore();
    const runner = new SagaRunner(store);
    const result = await runner.run(makeSaga({ fail: "a" }), { log: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failedStep).toBe("a");
    expect(result.compensatedSteps).toEqual([]);
    expect(result.finalStatus).toBe("compensated");
  });
});

describe("SagaRunner — compensation itself fails", () => {
  it("returns finalStatus: failed when a compensation errors mid-rollback", async () => {
    const store = new InMemorySagaStore();
    const runner = new SagaRunner(store);
    const result = await runner.run(
      makeSaga({ fail: "d", failCompensate: "b" }),
      { log: [] },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failedStep).toBe("d");
    // c compensated successfully before b failed.
    expect(result.compensatedSteps).toEqual(["c"]);
    expect(result.finalStatus).toBe("failed");
    const instance = await store.get(result.instanceId);
    expect(instance?.status).toBe("failed");
    expect(instance?.failureReason).toContain("compensation failed at b");
  });
});

describe("SagaRunner — steps without compensate are skipped", () => {
  it("skips a step that has no compensate function during rollback", async () => {
    const store = new InMemorySagaStore();
    const runner = new SagaRunner(store);
    const saga: SagaDefinition<CounterState> = {
      name: "no-comp-saga",
      steps: [
        // eslint-disable-next-line @typescript-eslint/require-await
        { name: "x", execute: async (s) => ({ log: [...s.log, "exec:x"] }) },
        // eslint-disable-next-line @typescript-eslint/require-await
        { name: "y", execute: async () => { throw new Error("execute-failed:y"); } },
      ],
    };
    const result = await runner.run(saga, { log: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.compensatedSteps).toEqual([]); // x had no compensate to run
    expect(result.finalStatus).toBe("compensated");
  });
});

describe("InMemorySagaStore", () => {
  it("create + get roundtrip", async () => {
    const store = new InMemorySagaStore();
    await store.create({
      instanceId: "test-1",
      sagaName: "test",
      status: "pending",
      currentStep: 0,
      state: { value: 1 },
      completedSteps: [],
      compensatedSteps: [],
      startedAt: new Date(),
      updatedAt: new Date(),
    });
    const fetched = await store.get<{ value: number }>("test-1");
    expect(fetched?.state.value).toBe(1);
  });

  it("update merges patch into existing instance", async () => {
    const store = new InMemorySagaStore();
    await store.create({
      instanceId: "test-2",
      sagaName: "test",
      status: "pending",
      currentStep: 0,
      state: {},
      completedSteps: [],
      compensatedSteps: [],
      startedAt: new Date(),
      updatedAt: new Date(),
    });
    await store.update("test-2", { status: "in-progress", currentStep: 1 });
    const fetched = await store.get("test-2");
    expect(fetched?.status).toBe("in-progress");
    expect(fetched?.currentStep).toBe(1);
  });

  it("create throws on duplicate instanceId", async () => {
    const store = new InMemorySagaStore();
    const inst = {
      instanceId: "dup",
      sagaName: "test",
      status: "pending" as const,
      currentStep: 0,
      state: {},
      completedSteps: [],
      compensatedSteps: [],
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    await store.create(inst);
    await expect(store.create(inst)).rejects.toThrow(/already exists/);
  });

  it("list filters by sagaName + status", async () => {
    const store = new InMemorySagaStore();
    const baseDate = new Date();
    await store.create({
      instanceId: "a",
      sagaName: "saga-1",
      status: "completed",
      currentStep: 2,
      state: {},
      completedSteps: [],
      compensatedSteps: [],
      startedAt: baseDate,
      updatedAt: baseDate,
    });
    await store.create({
      instanceId: "b",
      sagaName: "saga-1",
      status: "compensated",
      currentStep: 1,
      state: {},
      completedSteps: [],
      compensatedSteps: [],
      startedAt: baseDate,
      updatedAt: baseDate,
    });
    await store.create({
      instanceId: "c",
      sagaName: "saga-2",
      status: "completed",
      currentStep: 1,
      state: {},
      completedSteps: [],
      compensatedSteps: [],
      startedAt: baseDate,
      updatedAt: baseDate,
    });
    const completedSaga1 = await store.list({
      sagaName: "saga-1",
      status: "completed",
    });
    expect(completedSaga1.map((i) => i.instanceId)).toEqual(["a"]);
    const allSaga1 = await store.list({ sagaName: "saga-1" });
    expect(allSaga1.map((i) => i.instanceId).sort()).toEqual(["a", "b"]);
  });
});
