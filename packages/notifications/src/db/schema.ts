/**
 * Per-tenant `notification_templates` table — adopter-facing override store
 * per ADR-0004 §4 + STORY-018.
 *
 * Lives inside each tenant's schema (`tenant_<hex>.notification_templates`)
 * so the schema admin (UI / CLI) operates on their own tenant's overrides
 * with the same RBAC scope as everything else in their schema.
 *
 * Adopters wire the migration via `NOTIFICATIONS_MIGRATION` from this
 * package's public exports — composes with `RBAC_MIGRATION` from
 * `@starter-saas/tenancy` in their migration list.
 */

/** Structural shape of `TenantMigration` (matches `@starter-saas/tenancy`'s
 *  type — kept local here to avoid a dependency on tenancy from notifications). */
export interface NotificationsTenantMigration {
  id: string;
  sql: string;
}

/** Stable migration ID. */
export const NOTIFICATIONS_MIGRATION_ID = "0002_notification_templates" as const;

/** DDL for the per-tenant `notification_templates` table. Applied by the
 *  migration runner against each tenant schema. */
export const NOTIFICATIONS_MIGRATION: NotificationsTenantMigration = {
  id: NOTIFICATIONS_MIGRATION_ID,
  sql: `
    CREATE TABLE notification_templates (
      template_id  text PRIMARY KEY,
      subject      text NOT NULL,
      text_body    text NOT NULL,
      html_body    text,
      updated_at   timestamptz NOT NULL DEFAULT now()
    )
  `,
};
