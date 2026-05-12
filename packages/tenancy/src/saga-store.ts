/**
 * DrizzleSagaStore — production SagaStore implementation backed by
 * `platform.saga_instances`. Adopter constructs once at boot:
 *
 *     const sagaStore = new DrizzleSagaStore(db);
 *     const runner = new SagaRunner(sagaStore);
 *
 * Same `SagaStore` contract as `InMemorySagaStore`; saga code is unchanged
 * across the swap.
 *
 * NB: in-process saga execution still uses the synchronous SagaRunner from
 * @starter-saas/saga. The event-driven choreography variant (where the runner
 * dispatches via the event bus and resumes after a process restart) lands in
 * STORY-017 alongside the pg-outbox bus adapter. The shape of `SagaInstance`
 * persisted here is the input both runners share.
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type {
  SagaInstance,
  SagaListFilter,
  SagaStatus,
  SagaStore,
} from "@starter-saas/saga";

import * as schema from "./db/schema.js";
import { sagaInstances } from "./db/schema.js";

/** The Drizzle DB handle this store binds to.  Adopter constructs with the
 *  postgres-js variant — matches the rest of the kit (D-32). */
export type SagaStoreDb = PostgresJsDatabase<typeof schema>;

export class DrizzleSagaStore implements SagaStore {
  constructor(private readonly db: SagaStoreDb) {}

  async create<State>(instance: SagaInstance<State>): Promise<void> {
    await this.db.insert(sagaInstances).values({
      instanceId: instance.instanceId,
      sagaName: instance.sagaName,
      status: instance.status,
      currentStep: instance.currentStep,
      state: instance.state as unknown,
      completedSteps: instance.completedSteps,
      compensatedSteps: instance.compensatedSteps,
      failureReason: instance.failureReason ?? null,
      startedAt: instance.startedAt,
      updatedAt: instance.updatedAt,
      completedAt: instance.completedAt ?? null,
    });
  }

  async update<State>(
    instanceId: string,
    patch: Partial<SagaInstance<State>>,
  ): Promise<void> {
    // Build the update object only with provided fields; Drizzle ignores
    // undefined values but we map nullable fields explicitly.
    const update: Partial<typeof sagaInstances.$inferInsert> = {};
    if (patch.sagaName !== undefined) update.sagaName = patch.sagaName;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.currentStep !== undefined) update.currentStep = patch.currentStep;
    if (patch.state !== undefined) update.state = patch.state as unknown;
    if (patch.completedSteps !== undefined) update.completedSteps = patch.completedSteps;
    if (patch.compensatedSteps !== undefined)
      update.compensatedSteps = patch.compensatedSteps;
    if ("failureReason" in patch) {
      update.failureReason = patch.failureReason ?? null;
    }
    if (patch.startedAt !== undefined) update.startedAt = patch.startedAt;
    if (patch.updatedAt !== undefined) update.updatedAt = patch.updatedAt;
    if ("completedAt" in patch) {
      update.completedAt = patch.completedAt ?? null;
    }

    await this.db
      .update(sagaInstances)
      .set(update)
      .where(eq(sagaInstances.instanceId, instanceId));
  }

  async get<State>(instanceId: string): Promise<SagaInstance<State> | null> {
    const rows = await this.db
      .select()
      .from(sagaInstances)
      .where(eq(sagaInstances.instanceId, instanceId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.rowToInstance<State>(row);
  }

  async list(filter?: SagaListFilter): Promise<SagaInstance[]> {
    const conditions = [];
    if (filter?.sagaName !== undefined) {
      conditions.push(eq(sagaInstances.sagaName, filter.sagaName));
    }
    if (filter?.status !== undefined) {
      conditions.push(eq(sagaInstances.status, filter.status));
    }
    const where = conditions.length === 0 ? undefined : and(...conditions);
    const rows = await this.db.select().from(sagaInstances).where(where);
    return rows.map((r) => this.rowToInstance(r));
  }

  private rowToInstance<State>(row: schema.SagaInstanceRow): SagaInstance<State> {
    const instance: SagaInstance<State> = {
      instanceId: row.instanceId,
      sagaName: row.sagaName,
      status: row.status as SagaStatus,
      currentStep: row.currentStep,
      state: row.state as State,
      completedSteps: row.completedSteps,
      compensatedSteps: row.compensatedSteps,
      startedAt: row.startedAt,
      updatedAt: row.updatedAt,
    };
    if (row.failureReason !== null) {
      instance.failureReason = row.failureReason;
    }
    if (row.completedAt !== null) {
      instance.completedAt = row.completedAt;
    }
    return instance;
  }
}
