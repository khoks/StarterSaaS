/**
 * Drizzle-backed default adapters for the provisioning saga.
 *
 * Adopters who use Drizzle (kit default per D-32) wire these directly:
 *
 *     const registry = new DrizzleTenantRegistry(db);
 *     const schemaManager = new DrizzleSchemaManager(db);
 *
 * Adopters using a different ORM can implement TenantRegistry + SchemaManager
 * themselves; the saga doesn't depend on Drizzle directly — only on the ports.
 */

import { eq, sql } from "drizzle-orm";

import { tenants } from "../db/schema.js";
import type { SchemaManager, TenantDb, TenantRegistry } from "./ports.js";

export class DrizzleTenantRegistry implements TenantRegistry {
  constructor(private readonly db: TenantDb) {}

  async reserveTenant(args: {
    tenantId: string;
    name: string;
    slug: string;
    plan: string;
    ownerId: string;
  }): Promise<void> {
    await this.db.insert(tenants).values({
      id: args.tenantId,
      name: args.name,
      slug: args.slug,
      plan: args.plan,
      ownerId: args.ownerId,
      status: "provisioning",
    });
  }

  async deleteTenant(args: { tenantId: string }): Promise<void> {
    await this.db.delete(tenants).where(eq(tenants.id, args.tenantId));
  }

  async markStatus(args: {
    tenantId: string;
    status: "provisioning" | "active" | "archived" | "deleted";
  }): Promise<void> {
    await this.db
      .update(tenants)
      .set({ status: args.status, updatedAt: new Date() })
      .where(eq(tenants.id, args.tenantId));
  }
}

export class DrizzleSchemaManager implements SchemaManager {
  constructor(private readonly db: TenantDb) {}

  async createSchema(args: { schemaName: string }): Promise<void> {
    await this.db.execute(
      sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(args.schemaName)}`,
    );
  }

  async dropSchema(args: { schemaName: string }): Promise<void> {
    await this.db.execute(
      sql`DROP SCHEMA IF EXISTS ${sql.identifier(args.schemaName)} CASCADE`,
    );
  }
}
