/**
 * Drizzle schema for the pg-outbox event-bus tables — `platform.outbox`,
 * `platform.event_dedupe`, `platform.event_dlq` per ADR-0005.
 *
 * The tables live in the `platform` schema (same namespace as `@starter-saas/tenancy`'s
 * tenancy tables). They're owned by `@starter-saas/event-bus` because both the
 * writer + poller need direct query access; placing them here avoids the
 * circular `event-bus → tenancy → event-bus` dep that would form if they
 * lived in tenancy.
 *
 * Adopter sets up the migration runner with the platform schema DDL from
 * `@starter-saas/tenancy/testing` (test harness) or via drizzle-kit-generated
 * SQL for production.
 */

import {
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Shared `platform` schema namespace. Matches `@starter-saas/tenancy`'s
 *  pgSchema("platform") — Drizzle treats both objects as the same SQL schema. */
export const platform = pgSchema("platform");

/** Durable event queue per ADR-0005. Producers INSERT a row in the same DB
 *  transaction as the business write (atomic-with-business-state, solves the
 *  dual-write problem). The `OutboxPoller` reads rows where `processed_at IS
 *  NULL` and dispatches to handlers; the row is marked processed once every
 *  subscribed consumer group has either a dedupe row or a DLQ row for it. */
export const outbox = platform.table("outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: text("topic").notNull(),
  partitionKey: text("partition_key").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  payload: jsonb("payload").notNull(),
  headers: jsonb("headers").$type<Record<string, string | undefined>>().notNull().default({}),
  emittedAt: timestamp("emitted_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  /** Set when every subscribed consumer group has either a dedupe row or a
   *  DLQ row for this event. Once set, the poller skips this row. */
  processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }),
});

/** Per-(consumer_group, idempotency_key) success ledger. Insertion = "this
 *  consumer group has successfully processed this event". Default 30-day TTL
 *  per ADR-0005 (pruning is a separate scheduled job — out of MVP-1 scope). */
export const eventDedupe = platform.table(
  "event_dedupe",
  {
    consumerGroup: text("consumer_group").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.consumerGroup, t.idempotencyKey] }),
  }),
);

/** Dead-letter queue for events whose handler exhausted the configured retry
 *  count. Replay path: `npx @starter-saas/cli events replay --dlq-id <id>`
 *  (lands in STORY-017 sub-PR #2). */
export const eventDlq = platform.table("event_dlq", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Original outbox row ID — null when the event was constructed directly
   *  by an adopter (e.g., manual DLQ injection for testing the replay path). */
  outboxId: uuid("outbox_id"),
  consumerGroup: text("consumer_group").notNull(),
  topic: text("topic").notNull(),
  partitionKey: text("partition_key").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  payload: jsonb("payload").notNull(),
  headers: jsonb("headers").$type<Record<string, string | undefined>>().notNull().default({}),
  lastError: text("last_error").notNull(),
  attempts: integer("attempts").notNull(),
  failedAt: timestamp("failed_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  /** Set when the DLQ row has been successfully replayed. */
  replayedAt: timestamp("replayed_at", { withTimezone: true, mode: "date" }),
});

export type OutboxRow = typeof outbox.$inferSelect;
export type NewOutboxRow = typeof outbox.$inferInsert;
export type EventDedupeRow = typeof eventDedupe.$inferSelect;
export type EventDlqRow = typeof eventDlq.$inferSelect;
export type NewEventDlqRow = typeof eventDlq.$inferInsert;
