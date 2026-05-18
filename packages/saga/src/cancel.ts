/**
 * `cancelSaga(store, sagaId, reason?)` — administrative saga cancel path.
 *
 * Per ADR-0005: `npx @starter-saas/cli sagas cancel --saga-id <id>` is the
 * manual cancel path. Flips status → "failed" + records the cancel reason.
 *
 * Does NOT walk compensations — manual cancel is a forced termination from
 * outside the saga's own state machine. If compensation is desired, the
 * adopter should trigger the saga's failure flow inside the runner instead.
 *
 * Refuses to cancel already-terminal sagas (completed / compensated / failed).
 */

import type { SagaInstance, SagaStore } from "./types.js";

export interface CancelSagaResult {
  ok: boolean;
  /** Set when ok=false. Discriminator:
   *  - "not-found": no saga instance with that ID
   *  - "already-terminal": status is already completed | compensated | failed
   */
  reason?: "not-found" | "already-terminal";
  /** The saga instance that was canceled (set on ok=true) or the existing
   *  instance whose state blocked the cancel (set on already-terminal). */
  instance?: SagaInstance;
}

const TERMINAL_STATUSES = new Set(["completed", "compensated", "failed"]);

export async function cancelSaga(
  store: SagaStore,
  sagaId: string,
  reason = "manual-cancel",
): Promise<CancelSagaResult> {
  const instance = await store.get(sagaId);
  if (!instance) return { ok: false, reason: "not-found" };
  if (TERMINAL_STATUSES.has(instance.status)) {
    return { ok: false, reason: "already-terminal", instance };
  }
  const now = new Date();
  await store.update(sagaId, {
    status: "failed",
    failureReason: reason,
    completedAt: now,
    updatedAt: now,
  });
  const updated = (await store.get(sagaId)) ?? instance;
  return { ok: true, instance: updated };
}
