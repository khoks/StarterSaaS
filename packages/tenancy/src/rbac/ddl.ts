/**
 * Per-tenant RBAC DDL — exported as a `TenantMigration` entry so the
 * migration runner can apply it alongside adopter migrations.
 *
 * Adopters compose their migration list as:
 *
 *     import { RBAC_MIGRATION } from "@starter-saas/tenancy";
 *     export const KIT_MIGRATIONS = [RBAC_MIGRATION, ...adopterMigrations];
 *
 * The migration creates `roles` + `user_roles` inside the tenant schema
 * (the migration runner SETs search_path before applying, so the unqualified
 * names resolve correctly).
 *
 * Saga step 4 (`DrizzleTenantSeeder`) INSERTs the default rows once these
 * tables exist.
 */

import type { TenantMigration } from "../migrations/types.js";

export const RBAC_MIGRATION_ID = "0001_kit_rbac" as const;

export const RBAC_MIGRATION: TenantMigration = {
  id: RBAC_MIGRATION_ID,
  sql: `
    CREATE TABLE roles (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name        text NOT NULL UNIQUE,
      permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE user_roles (
      user_id     uuid NOT NULL,
      role_id     uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      assigned_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, role_id)
    );
    CREATE INDEX user_roles_user_id_idx ON user_roles (user_id);
  `,
};
