/**
 * `OutboxWriter` — inserts an event row into `platform.outbox` against the
 * given DB handle (which may be a transaction or the bus's own connection).
 *
 * For atomic-with-business-state publishing (the dual-write fix per ADR-0005),
 * adopter wraps both the business INSERT + the outbox write in their own tx:
 *
 *     await db.transaction(async (tx) => {
 *       await tx.insert(businessTable).values(...);
 *       await new OutboxWriter(tx).write(event);
 *     });
 *
 * The bus's own `publish(event)` uses an `OutboxWriter` scoped to the bus's
 * top-level db handle — NOT atomic with an external tx; adopters wanting that
 * guarantee use this class directly.
 */

import type { Event } from "../types.js";
import type { OutboxDb } from "./db-handle.js";
import { outbox } from "./schema.js";

export class OutboxWriter {
  constructor(private readonly db: OutboxDb) {}

  async write<T>(event: Event<T>): Promise<{ id: string }> {
    const headers = (event.headers ?? {}) as Record<string, string | undefined>;
    const rows = await this.db
      .insert(outbox)
      .values({
        topic: event.topic,
        partitionKey: event.partitionKey,
        idempotencyKey: event.idempotencyKey,
        payload: event.payload as unknown,
        headers,
        ...(event.emittedAt !== undefined ? { emittedAt: event.emittedAt } : {}),
      })
      .returning({ id: outbox.id });
    return { id: rows[0]!.id };
  }
}
