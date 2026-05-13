/**
 * Zod boundary contracts for tenancy inputs — per D-25.
 *
 * Tenant CRUD operations + the provisioning saga land in subsequent sub-PRs
 * of STORY-014; these contracts are pre-defined here so the saga + CRUD
 * layers consume them without re-declaring shapes.
 */

import { z } from "zod";

/** URL-safe slug — lowercase alphanumeric + hyphens. */
export const TenantSlugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with optional hyphens");

export const TenantPlanSchema = z.enum(["free", "pro", "enterprise", "custom"]);

export const TenantStatusSchema = z.enum(["provisioning", "active", "archived", "deleted"]);

export const CreateTenantInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: TenantSlugSchema,
  plan: TenantPlanSchema.default("free"),
  ownerId: z.string().uuid(),
});

export const ArchiveTenantInputSchema = z.object({
  tenantId: z.string().uuid(),
  reason: z.string().max(1000).nullable().default(null),
  requestingUserId: z.string().uuid().nullable().default(null),
});

export const RestoreTenantInputSchema = z.object({
  tenantId: z.string().uuid(),
});

export type CreateTenantInput = z.infer<typeof CreateTenantInputSchema>;
export type ArchiveTenantInput = z.infer<typeof ArchiveTenantInputSchema>;
export type RestoreTenantInput = z.infer<typeof RestoreTenantInputSchema>;
