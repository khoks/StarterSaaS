/**
 * Unit tests for `cancelSaga` — the administrative manual-cancel path.
 */

import { describe, expect, it } from "vitest";

import {
  InMemorySagaStore,
  cancelSaga,
  type SagaInstance,
  type SagaStatus,
} from "../src/index.js";

function makeInstance(overrides: Partial<SagaInstance> = {}): SagaInstance {
  const now = new Date();
  return {
    instanceId: "00000000-0000-7000-8000-000000000001",
    sagaName: "test.saga",
    status: "in-progress" as SagaStatus,
    currentStep: 2,
    state: { foo: "bar" },
    completedSteps: ["step-1", "step-2"],
    compensatedSteps: [],
    startedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("cancelSaga()", () => {
  it("flips an in-progress saga to status=failed with the given reason", async () => {
    const store = new InMemorySagaStore();
    const inst = makeInstance();
    await store.create(inst);

    const result = await cancelSaga(store, inst.instanceId, "tenant requested cancel");
    expect(result.ok).toBe(true);
    expect(result.instance?.status).toBe("failed");
    expect(result.instance?.failureReason).toBe("tenant requested cancel");
    expect(result.instance?.completedAt).toBeInstanceOf(Date);
  });

  it("uses 'manual-cancel' as the default reason", async () => {
    const store = new InMemorySagaStore();
    const inst = makeInstance({ instanceId: "00000000-0000-7000-8000-000000000002" });
    await store.create(inst);

    const result = await cancelSaga(store, inst.instanceId);
    expect(result.ok).toBe(true);
    expect(result.instance?.failureReason).toBe("manual-cancel");
  });

  it("returns not-found for unknown saga ID", async () => {
    const store = new InMemorySagaStore();
    const result = await cancelSaga(store, "00000000-0000-7000-8000-deadbeefdead");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not-found");
  });

  it("refuses to cancel a completed saga", async () => {
    const store = new InMemorySagaStore();
    const inst = makeInstance({
      instanceId: "00000000-0000-7000-8000-000000000003",
      status: "completed",
    });
    await store.create(inst);

    const result = await cancelSaga(store, inst.instanceId);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("already-terminal");
    expect(result.instance?.status).toBe("completed");
  });

  it("refuses to cancel a compensated saga", async () => {
    const store = new InMemorySagaStore();
    const inst = makeInstance({
      instanceId: "00000000-0000-7000-8000-000000000004",
      status: "compensated",
    });
    await store.create(inst);

    const result = await cancelSaga(store, inst.instanceId);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("already-terminal");
  });

  it("refuses to cancel a failed saga", async () => {
    const store = new InMemorySagaStore();
    const inst = makeInstance({
      instanceId: "00000000-0000-7000-8000-000000000005",
      status: "failed",
    });
    await store.create(inst);

    const result = await cancelSaga(store, inst.instanceId);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("already-terminal");
  });

  it("cancels a pending saga (not-yet-started)", async () => {
    const store = new InMemorySagaStore();
    const inst = makeInstance({
      instanceId: "00000000-0000-7000-8000-000000000006",
      status: "pending",
    });
    await store.create(inst);

    const result = await cancelSaga(store, inst.instanceId, "abort-before-start");
    expect(result.ok).toBe(true);
    expect(result.instance?.status).toBe("failed");
  });

  it("cancels a compensating saga (mid-rollback)", async () => {
    const store = new InMemorySagaStore();
    const inst = makeInstance({
      instanceId: "00000000-0000-7000-8000-000000000007",
      status: "compensating",
    });
    await store.create(inst);

    const result = await cancelSaga(store, inst.instanceId);
    expect(result.ok).toBe(true);
    expect(result.instance?.status).toBe("failed");
  });
});
