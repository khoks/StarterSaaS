/**
 * Integration-test bootstrap — boots PGlite + applies the auth + tenancy
 * platform schemas + returns a Drizzle handle typed against the combined
 * schema namespace.
 *
 * Why duplicate the DDL here: the tenancy test harness in
 * `@starter-saas/tenancy/testing` applies the tenancy tables only; the auth
 * tables are required for sign-up / sign-in flows. We hand-roll the auth
 * DDL inline rather than introduce a `@starter-saas/auth/testing` sub-path
 * export — this is the only consumer and the contract is exercised by the
 * route tests directly.
 */

import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";

import { schema as authSchema } from "@starter-saas/auth";
import {
  applyPlatformSchema as applyTenancySchema,
} from "@starter-saas/tenancy/testing";
import type { TenantDb } from "@starter-saas/tenancy";

export interface IntegrationTestEnv {
  /** Drizzle handle — typed loosely as the union of auth + tenancy schemas. */
  db: TenantDb;
  /** Raw PGlite client for `query` / `exec` escape hatches. */
  client: PGlite;
  /** Tear down. Safe to call repeatedly. */
  close(): Promise<void>;
}

export async function createIntegrationDb(): Promise<IntegrationTestEnv> {
  const client = new PGlite();
  const db = drizzle(client, { schema: authSchema });
  await applyTenancySchema(db as unknown as Parameters<typeof applyTenancySchema>[0]);
  await applyAuthSchema(db);
  return {
    db: db as unknown as TenantDb,
    client,
    async close() {
      await client.close();
    },
  };
}

/** Apply auth-package DDL mirroring `packages/auth/src/db/schema.ts`. */
async function applyAuthSchema(
  db: PgliteDatabase<typeof authSchema>,
): Promise<void> {
  await db.execute(`CREATE SCHEMA IF NOT EXISTS platform`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.users (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email           text NOT NULL UNIQUE,
      name            text,
      image           text,
      email_verified  timestamptz,
      password_hash   text,
      totp_enabled    boolean NOT NULL DEFAULT false,
      totp_secret     text,
      failed_attempts integer NOT NULL DEFAULT 0,
      locked_until    timestamptz,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.accounts (
      user_id              uuid NOT NULL REFERENCES platform.users(id) ON DELETE CASCADE,
      type                 text NOT NULL,
      provider             text NOT NULL,
      provider_account_id  text NOT NULL,
      refresh_token        text,
      access_token         text,
      expires_at           integer,
      token_type           text,
      scope                text,
      id_token             text,
      session_state        text,
      PRIMARY KEY (provider, provider_account_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.sessions (
      session_token     text PRIMARY KEY,
      user_id           uuid NOT NULL REFERENCES platform.users(id) ON DELETE CASCADE,
      expires           timestamptz NOT NULL,
      active_tenant_id  uuid,
      created_at        timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.verification_tokens (
      identifier text NOT NULL,
      token      text NOT NULL,
      expires    timestamptz NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.user_tenant (
      user_id    uuid NOT NULL REFERENCES platform.users(id) ON DELETE CASCADE,
      tenant_id  uuid NOT NULL,
      role_label text NOT NULL DEFAULT 'member',
      joined_at  timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, tenant_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.user_tenant_invites (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email         text NOT NULL,
      tenant_id     uuid NOT NULL,
      role_label    text NOT NULL DEFAULT 'member',
      token         text NOT NULL UNIQUE,
      expires       timestamptz NOT NULL,
      invited_by    uuid REFERENCES platform.users(id) ON DELETE SET NULL,
      accepted_at   timestamptz,
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform.audit_log (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     uuid REFERENCES platform.users(id) ON DELETE SET NULL,
      tenant_id   uuid,
      action      text NOT NULL,
      details     jsonb NOT NULL DEFAULT '{}'::jsonb,
      ip_address  text,
      user_agent  text,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
}
