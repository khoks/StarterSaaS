/**
 * Session shape — Zod-validated boundary type (per D-25).
 *
 * The session is what the app sees after Auth.js authenticates a request:
 * user identity + active tenant context + role label for that tenant.
 *
 * Tenant memberships are NOT embedded — they are fetched on-demand from
 * `platform.user_tenant` by the tenant-switcher endpoint or by middleware
 * that needs to enumerate tenants for the active user.
 */

import { z } from "zod";

export const SessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().url().nullable(),
  emailVerified: z.date().nullable(),
  totpEnabled: z.boolean(),
});

export const SessionTenantSchema = z.object({
  tenantId: z.string().uuid(),
  roleLabel: z.string().min(1),
  joinedAt: z.date(),
});

/**
 * The full session shape passed to RSC + route handlers.
 *
 * `activeTenant` is null when the user has just signed in and not yet picked
 * a tenant (multi-tenant users); the tenant-switcher UI is responsible for
 * setting it before any tenant-scoped operation.
 */
export const SessionSchema = z.object({
  user: SessionUserSchema,
  activeTenant: SessionTenantSchema.nullable(),
  /** Session expiry (rolling 30d, idle 7d by default per ADR-0007). */
  expires: z.date(),
});

export type SessionUser = z.infer<typeof SessionUserSchema>;
export type SessionTenant = z.infer<typeof SessionTenantSchema>;
export type Session = z.infer<typeof SessionSchema>;
