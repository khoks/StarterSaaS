/**
 * In-memory SagaStore — for tests + in-process saga execution.
 *
 * Production swaps in `DrizzleSagaStore` writing to `platform.saga_instances`
 * (lands with tenancy schemas in STORY-014 sub-PR #2).
 */

import type { SagaInstance, SagaListFilter, SagaStore } from "./types.js";

export class InMemorySagaStore implements SagaStore {
  private readonly instances = new Map<string, SagaInstance>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async create<State>(instance: SagaInstance<State>): Promise<void> {
    if (this.instances.has(instance.instanceId)) {
      throw new Error(
        `InMemorySagaStore: instance ${instance.instanceId} already exists`,
      );
    }
    this.instances.set(instance.instanceId, instance as SagaInstance);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async update<State>(
    instanceId: string,
    patch: Partial<SagaInstance<State>>,
  ): Promise<void> {
    const current = this.instances.get(instanceId);
    if (!current) {
      throw new Error(`InMemorySagaStore: instance ${instanceId} not found`);
    }
    this.instances.set(instanceId, { ...current, ...patch } as SagaInstance);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async get<State>(instanceId: string): Promise<SagaInstance<State> | null> {
    return (this.instances.get(instanceId) as SagaInstance<State> | undefined) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async list(filter?: SagaListFilter): Promise<SagaInstance[]> {
    let rows = [...this.instances.values()];
    if (filter?.sagaName !== undefined) {
      rows = rows.filter((r) => r.sagaName === filter.sagaName);
    }
    if (filter?.status !== undefined) {
      rows = rows.filter((r) => r.status === filter.status);
    }
    return rows;
  }
}
