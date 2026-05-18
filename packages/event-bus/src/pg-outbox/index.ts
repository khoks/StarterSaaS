/**
 * Pg-outbox event-bus adapter — production default per ADR-0005.
 *
 * Public surface:
 *   - `PgOutboxEventBus` — production `EventBus` adapter
 *   - `OutboxWriter` — adopter-tx-aware producer (atomic with business writes)
 *   - `OutboxPoller` — the polling consumer (exposed for advanced adopter setups)
 *   - Drizzle table refs + types for `platform.outbox`, `platform.event_dedupe`,
 *     `platform.event_dlq`
 */

export { PgOutboxEventBus, type PgOutboxEventBusOptions } from "./bus.js";
export { OutboxPoller, type OutboxPollerOptions, type PollerHandler } from "./poller.js";
export { OutboxWriter } from "./writer.js";
export { listDlqEntries, replayDlqEntry, type ReplayResult } from "./replay.js";
export type { OutboxDb } from "./db-handle.js";
export {
  eventDedupe,
  eventDlq,
  outbox,
  platform as outboxPlatformSchema,
  type EventDedupeRow,
  type EventDlqRow,
  type NewEventDlqRow,
  type NewOutboxRow,
  type OutboxRow,
} from "./schema.js";
