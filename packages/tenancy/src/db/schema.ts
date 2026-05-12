/**
 * Drizzle schemas for the tenancy subsystem — per ADR-0004 multi-tenancy detail.
 *
 * All tables live under the `platform` schema (shared with @starter-saas/auth).
 * Cross-package references are uuid-typed without DB-level foreign-key
 * constraints — coupling at the application layer (typed across package
 * boundaries via TypeScript), not at the DB layer (avoids the cross-package
 * migration-ordering headache).
 *
 * Tables in this package:
 *   - `platform.tenants`               — tenant registry (the source-of-truth for what tenants exist)
 *   - `platform.tenant_migrations`     — per-tenant per-migration tracking (consumed by ADR-0004's migration runner)
 *   - `platform.tenant_archive_log`    — audit trail of archive + delete operations on tenants
 *   - `platform.saga_instances`        — saga-runner persistence (consumed by DrizzleSagaStore)
 */

import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Shared `platform` schema (must match @starter-saas/auth's pgSchema("platform")). */
export const platform = pgSchema("platform");

/** Tenant lifecycle status. String-literal union per D-25 (no enums). */
export type TenantStatus = "provisioning" | "active" | "archived" | "deleted";

export const tenants = platform.table("tenants", {
  /** UUIDv7 generated in application code (Drizzle's default uses .defaultRandom()
   *  → UUIDv4; app code overrides to UUIDv7 for sortability per ADR-0004). */
  id: uuid("id").primaryKey().defaultRandom(),
  /** Human-readable tenant name. Adopter-set; not used as a key anywhere. */
  name: text("name").notNull(),
  /** URL-safe identifier (e.g. `acme-corp`). Unique per platform. */
  slug: text("slug").notNull().unique(),
  /** Subscription tier — free / pro / enterprise / custom. String, not enum. */
  plan: text("plan").notNull().default("free"),
  /** Lifecycle status. */
  status: text("status").$type<TenantStatus>().notNull().default("provisioning"),
  /** Soft FK to `platform.users.id` — owner of this tenant. Set during the
   *  provisioning saga's step 1 (reserve tenant ID + record owner). */
  ownerId: uuid("owner_id"),
  /** Stage-1 of the 2-stage archival (per ADR-0004). Null = active. */
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
  /** GDPR-vs-retention reconciliation flag. When true, blocks hard delete. */
  legalHold: boolean("legal_hold").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const tenantMigrations = platform.table(
  "tenant_migrations",
  {
    tenantId: uuid("tenant_id").notNull(),
    /** Drizzle-kit migration tag — `0001_initial_setup` style. */
    migrationId: text("migration_id").notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    /** Set when the migration runner caught an exception applying this
     *  migration to this tenant. Allows continue-on-error policy from ADR-0004
     *  while surfacing failures for retry/manual repair. */
    failedAt: timestamp("failed_at", { withTimezone: true, mode: "date" }),
    failureReason: text("failure_reason"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.migrationId] }),
  }),
);

export const tenantArchiveLog = platform.table("tenant_archive_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }).notNull(),
  /** When the hard delete fires (stage 2 of archival, default 30 days post-archive
   *  per ADR-0004); null until then. */
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  reason: text("reason"),
  /** Soft FK to `platform.users.id` — who initiated the archival. */
  requestingUserId: uuid("requesting_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/** Saga-runner persistence backing `DrizzleSagaStore`. Shape mirrors
 *  `SagaInstance` from @starter-saas/saga; field-by-field types match. */
export const sagaInstances = platform.table("saga_instances", {
  /** UUID matching `SagaInstance.instanceId`. */
  instanceId: uuid("instance_id").primaryKey(),
  sagaName: text("saga_name").notNull(),
  /** SagaStatus union value (validated at runtime by SagaRunner; opaque to the DB). */
  status: text("status").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  /** Generic state payload — adopter-defined per saga; opaque to DB. */
  state: jsonb("state").notNull(),
  completedSteps: jsonb("completed_steps").$type<string[]>().notNull().default([]),
  compensatedSteps: jsonb("compensated_steps").$type<string[]>().notNull().default([]),
  failureReason: text("failure_reason"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
});

/** Public type exports. */
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type TenantMigration = typeof tenantMigrations.$inferSelect;
export type TenantArchiveLogEntry = typeof tenantArchiveLog.$inferSelect;
export type SagaInstanceRow = typeof sagaInstances.$inferSelect;
export type NewSagaInstanceRow = typeof sagaInstances.$inferInsert;
