/**
 * Event payload contracts for the tenant-provisioning saga.
 *
 * Step 8 emits `tenant.provisioned` per ADR-0004; that is the terminal event
 * downstream subsystems (billing, notifications, observability rollups)
 * subscribe to. Failure-side events fire when compensation triggers — adopters
 * can subscribe a notifications handler that pages the platform admin team.
 *
 * Topic name = "platform" (cross-tenant topic — events about *tenants*, not
 * events from *inside* a tenant). PartitionKey = tenantId so events for one
 * tenant stay in-order. IdempotencyKey = `tenant-provisioning:{tenantId}:{event}`.
 */

import { z } from "zod";

/** Terminal success event — emitted at step 8. */
export const TENANT_PROVISIONED_EVENT = "tenant.provisioned" as const;
/** Compensation event — emitted when the saga runs reverse-compensation. */
export const TENANT_PROVISIONING_FAILED_EVENT = "tenant.provisioning_failed" as const;

/** Topic for tenant-lifecycle events (cross-tenant; published to the `platform`
 *  topic, not to tenant-scoped topics). */
export const TENANT_PROVISIONING_TOPIC = "platform" as const;

export const TenantProvisionedPayloadSchema = z.object({
  event: z.literal(TENANT_PROVISIONED_EVENT),
  tenantId: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  plan: z.string(),
  ownerId: z.string().uuid(),
  schemaName: z.string(),
  provisionedAt: z.date(),
});

export const TenantProvisioningFailedPayloadSchema = z.object({
  event: z.literal(TENANT_PROVISIONING_FAILED_EVENT),
  tenantId: z.string().uuid(),
  slug: z.string(),
  failedStep: z.string(),
  reason: z.string(),
  failedAt: z.date(),
});

export type TenantProvisionedPayload = z.infer<typeof TenantProvisionedPayloadSchema>;
export type TenantProvisioningFailedPayload = z.infer<
  typeof TenantProvisioningFailedPayloadSchema
>;
