/**
 * @starter-saas/event-bus — Kafka-shaped event bus contract + in-memory adapter.
 *
 * Per D-45 / ADR-0005: the contract surface is Kafka-shaped from day 1. This
 * package ships the types + `InMemoryEventBus` (for tests + in-process saga
 * execution). Production adapters land in:
 *
 *   - `@starter-saas/event-bus-pg-outbox` (MVP-1 default — STORY-017)
 *   - `@starter-saas/event-bus-kafka` (v1 target — drop-in swap)
 *
 * All adapters satisfy the same `EventBus` interface — adopter code is
 * unchanged across swaps.
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
