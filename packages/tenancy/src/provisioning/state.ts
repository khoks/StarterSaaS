/**
 * State shape carried through the 9-step provisioning saga.
 *
 * Per ADR-0004 §3: each step receives `state`, advances it, and the runner
 * persists the snapshot to `platform.saga_instances` after every step. On
 * resume, the saga reads back the snapshot and continues from `currentStep`.
 *
 * Field nullability mirrors which steps have run:
 *   - `tenantId` + `schemaName` set by step 1 (reserve tenant ID)
 *   - `secretIds` populated by step 5 (provision secrets) — empty array when
 *     the SecretsProvider is a no-op
 *   - `billingId` set by step 6 (register billing) — null when BillingRegistry
 *     is a no-op
 *   - `welcomeSentAt` set by step 9 (send welcome email) — Date marker for
 *     audit + idempotency on resume
 */

import type { CreateTenantInput } from "../contracts.js";

export interface ProvisioningState {
  /** Validated saga input — the original CreateTenantInput. */
  readonly input: CreateTenantInput;

  /** UUIDv7 assigned in step 1. Empty string before step 1 runs. */
  tenantId: string;

  /** Postgres schema-name literal `tenant_{uuid-no-hyphens}`. Set in step 1
   *  alongside `tenantId`. Empty string before step 1. */
  schemaName: string;

  /** Secret IDs from step 5 — adopter's SecretsProvider returns these so the
   *  compensating action knows what to delete. Empty array when SecretsProvider
   *  is a no-op. */
  secretIds: string[];

  /** Billing-system tenant ID from step 6 — null when BillingRegistry is a
   *  no-op or when the tenant's plan doesn't require billing registration. */
  billingId: string | null;

  /** Marker timestamp set in step 9 — adopter-side notifications adapter is
   *  fire-and-forget; this marker lets observability dashboards confirm the
   *  welcome step ran. */
  welcomeSentAt: Date | null;
}

/** Build a fresh ProvisioningState from validated CreateTenantInput. */
export function initialProvisioningState(input: CreateTenantInput): ProvisioningState {
  return {
    input,
    tenantId: "",
    schemaName: "",
    secretIds: [],
    billingId: null,
    welcomeSentAt: null,
  };
}
