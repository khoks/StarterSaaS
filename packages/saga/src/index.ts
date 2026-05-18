/**
 * @starter-saas/saga — Saga primitives: state machine + compensation registry +
 * pluggable persistence (SagaStore).
 *
 * Per D-45 / ADR-0005. In MVP-1 the runner is synchronous + in-process; the
 * event-driven choreography variant (where steps subscribe to the event bus
 * and resume across processes) lands in STORY-017 with the pg-outbox adapter.
 *
 * The contract (SagaDefinition / SagaStep / SagaStore) is shared — same
 * sagas run under either dispatcher.
 */

export const PACKAGE_NAME = "@starter-saas/saga" as const;

export type {
  SagaDefinition,
  SagaInstance,
  SagaListFilter,
  SagaResult,
  SagaStatus,
  SagaStep,
  SagaStore,
} from "./types.js";

export { SagaRunner } from "./runner.js";
export type { RunOptions } from "./runner.js";

export { InMemorySagaStore } from "./in-memory-store.js";

export { cancelSaga, type CancelSagaResult } from "./cancel.js";
