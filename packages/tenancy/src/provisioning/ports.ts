/**
 * Adapter port interfaces for the tenant-provisioning saga.
 *
 * The saga is generic over these adapters — concrete impls swap in via
 * dependency injection:
 *
 *   - **TenantRegistry** — CRUD over `platform.tenants` (reserve / delete /
 *     mark-status). Default impl in `./drizzle-adapters.ts` wraps Drizzle;
 *     adopters who use a different ORM swap in their own.
 *
 *   - **SchemaManager** — runs the CREATE/DROP SCHEMA DDL. Default impl in
 *     `./drizzle-adapters.ts` uses Drizzle's `db.execute(sql\`...\`)`.
 *
 *   - **TenantMigrator** — runs all kit migrations against a freshly-created
 *     tenant schema. The migration runner lives in `@starter-saas/cli`
 *     (per ADR-0004 §1, STORY-015 territory); MVP-1 ships a NoOp default.
 *
 *   - **TenantSeeder** — INSERTs default RBAC roles, brand defaults, settings
 *     rows into the new tenant schema. Adopter overrides for domain defaults.
 *
 *   - **SecretsProvider** — provisions per-tenant secrets in the cloud
 *     Secrets Manager (D-41). Default NoOp; adopter swaps in AWS / GCP impl.
 *
 *   - **BillingRegistry** — registers the tenant with the billing subsystem.
 *     Default NoOp. Returns a `billingId` the compensating action uses to
 *     cancel.
 *
 *   - **NotificationsSender** — sends the welcome email + activation token.
 *     Default NoOp; adopter wires Postmark / SES / etc.
 *
 * All ports are async; all throw on failure so the saga runner routes to
 * compensation per ADR-0004 §3.
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "../db/schema.js";

/** Drizzle DB handle the default adapters bind against. */
export type TenantDb = PostgresJsDatabase<typeof schema>;

/** Step 1 + 7 — CRUD over `platform.tenants`. */
export interface TenantRegistry {
  reserveTenant(args: {
    tenantId: string;
    name: string;
    slug: string;
    plan: string;
    ownerId: string;
  }): Promise<void>;
  deleteTenant(args: { tenantId: string }): Promise<void>;
  markStatus(args: {
    tenantId: string;
    status: "provisioning" | "active" | "archived" | "deleted";
  }): Promise<void>;
}

/** Step 2 — CREATE / DROP SCHEMA DDL. */
export interface SchemaManager {
  createSchema(args: { schemaName: string }): Promise<void>;
  dropSchema(args: { schemaName: string }): Promise<void>;
}

/** Step 3 — applies all kit migrations against `schemaName`, records to
 *  `platform.tenant_migrations`. Concrete impl in `@starter-saas/cli`
 *  (STORY-015 territory). */
export interface TenantMigrator {
  applyMigrations(args: {
    tenantId: string;
    schemaName: string;
  }): Promise<{ applied: readonly string[] }>;
}

/** Step 4 — seeds the new tenant schema with default RBAC roles, brand
 *  defaults, settings rows. No compensation: step 2 (DROP SCHEMA on
 *  rollback) subsumes any inserts here per ADR-0004 §3 ("default
 *  compensation halts at step 2"). */
export interface TenantSeeder {
  seedDefaults(args: {
    tenantId: string;
    schemaName: string;
    ownerId: string;
    plan: string;
  }): Promise<void>;
}

/** Step 5 — provisions per-tenant secrets (encryption keys, API tokens, etc.)
 *  in the cloud Secrets Manager. Returns secret IDs the compensating action
 *  uses to delete on rollback. */
export interface SecretsProvider {
  provisionSecretsForTenant(args: {
    tenantId: string;
  }): Promise<{ secretIds: readonly string[] }>;
  removeSecretsForTenant(args: {
    tenantId: string;
    secretIds: readonly string[];
  }): Promise<void>;
}

/** Step 6 — registers the tenant with the billing subsystem; returns the
 *  billing-provider's tenant handle so the compensating action can cancel
 *  on rollback. NoOp returns `{ billingId: null }`. */
export interface BillingRegistry {
  registerTenant(args: {
    tenantId: string;
    plan: string;
    ownerId: string;
  }): Promise<{ billingId: string | null }>;
  cancelTenantRegistration(args: {
    tenantId: string;
    billingId: string;
  }): Promise<void>;
}

/** Step 9 — sends the welcome email / activation token. No compensation
 *  (cannot un-send an email). NoOp is a fire-and-forget no-op. */
export interface NotificationsSender {
  sendWelcomeEmail(args: {
    tenantId: string;
    ownerId: string;
    tenantName: string;
    tenantSlug: string;
  }): Promise<void>;
}

// ---------------------------------------------------------------------------
// Default no-op adapters for the steps that often arrive incrementally.
//
// TenantRegistry + SchemaManager don't have NoOp defaults — the saga can't
// usefully run without them, and `./drizzle-adapters.ts` provides production
// Drizzle-backed impls.
// ---------------------------------------------------------------------------

export const noopTenantMigrator: TenantMigrator = {
  // eslint-disable-next-line @typescript-eslint/require-await
  async applyMigrations() {
    return { applied: [] };
  },
};

export const noopTenantSeeder: TenantSeeder = {
  // eslint-disable-next-line @typescript-eslint/require-await
  async seedDefaults() {
    /* no-op */
  },
};

export const noopSecretsProvider: SecretsProvider = {
  // eslint-disable-next-line @typescript-eslint/require-await
  async provisionSecretsForTenant() {
    return { secretIds: [] };
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async removeSecretsForTenant() {
    /* no-op */
  },
};

export const noopBillingRegistry: BillingRegistry = {
  // eslint-disable-next-line @typescript-eslint/require-await
  async registerTenant() {
    return { billingId: null };
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async cancelTenantRegistration() {
    /* no-op */
  },
};

export const noopNotificationsSender: NotificationsSender = {
  // eslint-disable-next-line @typescript-eslint/require-await
  async sendWelcomeEmail() {
    /* no-op */
  },
};
