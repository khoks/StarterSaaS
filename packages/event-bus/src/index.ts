/**
 * @starter-saas/event-bus — Kafka-shaped event bus contract + adapters.
 *
 * Per D-45 / ADR-0005: the contract surface is Kafka-shaped from day 1. This
 * package ships:
 *
 *   - Types + Zod contracts for the bus envelope
 *   - `InMemoryEventBus` (in-process, for tests + small flows)
 *   - `PgOutboxEventBus` (MVP-1 production default — STORY-017): Kafka
 *     semantics over Postgres outbox table; writer + poller + dedupe + DLQ
 *
 * Future adapters land in subsequent packages (`@starter-saas/event-bus-kafka`
 * v1 target, Redis Streams / EventBridge / Pub/Sub v1+). All adapters satisfy
 * the same `EventBus` interface — adopter code is unchanged across swaps.
 */

export const PACKAGE_NAME = "@starter-saas/event-bus" as const;

export type {
  DeadLetterEntry,
  Event,
  EventBus,
  EventHandler,
  EventHeaders,
  SubscribeOptions,
  Subscription,
} from "./types.js";

export { EventSchema } from "./types.js";

export { InMemoryEventBus } from "./in-memory.js";

// Pg-outbox adapter (MVP-1 production default per ADR-0005).
export * from "./pg-outbox/index.js";
