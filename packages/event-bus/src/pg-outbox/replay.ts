/**
 * DLQ replay — re-publishes a `platform.event_dlq` row back through the bus.
 *
 * Per ADR-0005: `npx @starter-saas/cli events replay --dlq-id <id>` is the
 * manual replay path. Replayed events:
 *   1. Are written back to `platform.outbox` (a fresh outbox row)
 *   2. Trigger normal poller dispatch — picked up by any consumer group that
 *      doesn't already have a dedupe row for the idempotency_key
 *   3. Mark the DLQ row `replayed_at = now()` so subsequent `events list-dlq`
 *      filters can hide already-replayed entries
 *
 * Caller responsibility: ensure the underlying issue that originally caused
 * the DLQ has been fixed (e.g. external service is healthy again). Otherwise
 * the replay will re-DLQ.
 */

import { and, eq, isNull } from "drizzle-orm";

import type { EventBus, Event } from "../types.js";

import type { OutboxDb } from "./db-handle.js";
import { eventDedupe, eventDlq, type EventDlqRow } from "./schema.js";

export interface ReplayResult {
  ok: boolean;
  /** Set when ok=false. Discriminator values:
   *  - "not-found": no DLQ row with that ID
   *  - "already-replayed": replayed_at was already set
   */
  reason?: "not-found" | "already-replayed";
  /** The DLQ row being replayed (set on success + already-replayed). */
  entry?: EventDlqRow;
}

/** Replay a single DLQ entry. The bus's `publish` is used — the event flows
 *  back through the outbox + poller path normally. The consumer group that
 *  originally failed has its dedupe slot cleared so the retry sees it as
 *  un-delivered. Other consumer groups that previously succeeded keep their
 *  dedupe rows untouched (they won't reprocess). */
export async function replayDlqEntry(
  db: OutboxDb,
  bus: EventBus,
  dlqId: string,
): Promise<ReplayResult> {
  const rows = await db.select().from(eventDlq).where(eq(eventDlq.id, dlqId)).limit(1);
  if (rows.length === 0) return { ok: false, reason: "not-found" };
  const entry = rows[0]!;
  if (entry.replayedAt !== null) {
    return { ok: false, reason: "already-replayed", entry };
  }

  // Defensive: clear the dedupe row for this (group, key) if one was somehow
  // recorded post-DLQ — keeps the contract clean that replays always re-fire.
  await db
    .delete(eventDedupe)
    .where(
      and(
        eq(eventDedupe.consumerGroup, entry.consumerGroup),
        eq(eventDedupe.idempotencyKey, entry.idempotencyKey),
      ),
    );

  const event: Event<unknown> = {
    topic: entry.topic,
    partitionKey: entry.partitionKey,
    idempotencyKey: entry.idempotencyKey,
    payload: entry.payload,
    headers: entry.headers as Record<string, string | undefined>,
  };
  await bus.publish(event);

  await db
    .update(eventDlq)
    .set({ replayedAt: new Date() })
    .where(eq(eventDlq.id, dlqId));

  return { ok: true, entry };
}

/** List DLQ entries — adopter-facing for `events list-dlq` and admin UI. */
export async function listDlqEntries(
  db: OutboxDb,
  options: { includeReplayed?: boolean } = {},
): Promise<readonly EventDlqRow[]> {
  if (options.includeReplayed === true) {
    return db.select().from(eventDlq).orderBy(eventDlq.failedAt);
  }
  return db.select().from(eventDlq).where(isNull(eventDlq.replayedAt)).orderBy(eventDlq.failedAt);
}
