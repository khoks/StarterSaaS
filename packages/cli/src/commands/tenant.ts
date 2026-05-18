/**
 * `starter-saas tenant <subcommand>` — tenant lifecycle commands per ADR-0004.
 *
 * Subcommand scope (STORY-015):
 *   - migrate      — apply Drizzle migrations across tenant schemas (sub-PR #2)
 *   - archive      — soft archive a tenant; status: archived (sub-PR #3 — this PR)
 *   - restore      — reverse soft archive within retention window (sub-PR #3 — this PR)
 *   - hard-delete  — sweep tenants past retention; DROP SCHEMA + audit row (sub-PR #3 — this PR)
 *   - doctor       — health report + drift detection (sub-PR #3 — this PR)
 *
 * The actions are library-driven: adopters provide a `tenant-context` loader
 * module (`--config <path>`) that default-exports a `TenantCliContext` with
 * the DB handle + (where needed) the migrations array + a SchemaManager. The
 * CLI imports it dynamically + delegates to functions from `@starter-saas/tenancy`.
 */

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { Command } from "commander";

import type { EventBus } from "@starter-saas/event-bus";
import type { SagaStore } from "@starter-saas/saga";

import {
  archiveTenant,
  restoreTenant,
  runHardDeleteSweep,
  runTenantDoctor,
  runTenantMigrations,
  type DoctorReport,
  type HardDeleteSweepReport,
  type SchemaManager,
  type TenantDb,
  type TenantMigration,
  type TenantMigrationsReport,
} from "@starter-saas/tenancy";

/** Shape of the adopter's `--config` module — default-export this object.
 *  Optional fields are only required for the subcommands that consume them. */
export interface TenantCliContext {
  db: TenantDb;
  /** Required for `tenant migrate`. */
  migrations?: readonly TenantMigration[];
  /** Required for `tenant hard-delete`. */
  schemaManager?: SchemaManager;
  /** Required for `events replay`. */
  eventBus?: EventBus;
  /** Required for `sagas list` + `sagas cancel`. */
  sagaStore?: SagaStore;
}

/** Back-compat alias for STORY-015 sub-PR #2 (`migrate`-only context shape). */
export type MigrateContext = TenantCliContext;

interface MigrateCommandOptions {
  config: string;
  tenant?: string;
  parallelism?: string;
  failFast?: boolean;
  dryRun?: boolean;
}

interface ArchiveCommandOptions {
  config: string;
  reason?: string;
  requestingUser?: string;
}

interface HardDeleteCommandOptions {
  config: string;
  retentionDays?: string;
  dryRun?: boolean;
}

interface DoctorCommandOptions {
  config: string;
  retentionDays?: string;
}

export function registerTenantCommands(
  program: Command,
  /** Override hook for tests so we don't have to write+import a real config file. */
  loadContext: (configPath: string) => Promise<TenantCliContext> = defaultLoadContext,
  /** Output sinks — overridable for tests. */
  io: { log: (msg: string) => void; error: (msg: string) => void } = {
    // eslint-disable-next-line no-console
    log: (msg) => console.log(msg),
    // eslint-disable-next-line no-console
    error: (msg) => console.error(msg),
  },
): void {
  const tenant = program
    .command("tenant")
    .description("Tenant lifecycle commands (per ADR-0004)");

  tenant
    .command("migrate")
    .description(
      "Apply Drizzle migrations across tenant schemas (default 5-parallel, continue-on-error)",
    )
    .requiredOption(
      "--config <path>",
      "Path to a TS/JS module that default-exports a TenantCliContext { db, migrations }",
    )
    .option("--tenant <id>", "Run migrations only for the given tenant ID")
    .option("--parallelism <n>", "Max tenants to migrate concurrently (default 5)", "5")
    .option("--fail-fast", "Abort on first per-tenant failure (default: continue-on-error)")
    .option("--dry-run", "Print planned migrations without applying")
    .action(async (options: MigrateCommandOptions) => {
      try {
        const ctx = await loadContext(options.config);
        if (!ctx.migrations) {
          throw new Error(
            "TenantCliContext.migrations is required for `tenant migrate`",
          );
        }
        const parallelism = options.parallelism
          ? Number.parseInt(options.parallelism, 10)
          : undefined;
        const report = await runTenantMigrations(ctx.db, ctx.migrations, {
          ...(options.tenant !== undefined ? { tenantId: options.tenant } : {}),
          ...(parallelism !== undefined && !Number.isNaN(parallelism)
            ? { parallelism }
            : {}),
          ...(options.failFast ? { failureMode: "fail-fast" as const } : {}),
          ...(options.dryRun ? { dryRun: true } : {}),
        });
        printMigrateReport(report, options.dryRun ?? false, io.log);
        if (!report.allSucceeded) process.exitCode = 1;
      } catch (err) {
        io.error(
          `tenant migrate failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });

  tenant
    .command("archive <tenantId>")
    .description("Soft archive a tenant (stage 1 — reversible within retention window)")
    .requiredOption(
      "--config <path>",
      "Path to a TS/JS module that default-exports a TenantCliContext { db }",
    )
    .option("--reason <text>", "Audit-log reason for the archive (max 1000 chars)")
    .option("--requesting-user <uuid>", "UUID of the platform user initiating the archive")
    .action(async (tenantId: string, options: ArchiveCommandOptions) => {
      try {
        const ctx = await loadContext(options.config);
        const result = await archiveTenant(ctx.db, {
          tenantId,
          reason: options.reason ?? null,
          requestingUserId: options.requestingUser ?? null,
        });
        io.log(
          result.archivedFreshly
            ? `Archived ${tenantId} at ${result.archivedAt.toISOString()} (audit row ${result.archiveLogId})`
            : `Tenant ${tenantId} was already archived at ${result.archivedAt.toISOString()} (no-op)`,
        );
      } catch (err) {
        io.error(
          `tenant archive failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });

  tenant
    .command("restore <tenantId>")
    .description("Reverse a soft-archive within the retention window")
    .requiredOption(
      "--config <path>",
      "Path to a TS/JS module that default-exports a TenantCliContext { db }",
    )
    .action(async (tenantId: string, options: { config: string }) => {
      try {
        const ctx = await loadContext(options.config);
        const result = await restoreTenant(ctx.db, { tenantId });
        if (result.restored) {
          io.log(`Restored ${tenantId} (status: active)`);
        } else if (result.reason === "not-archived") {
          io.log(`Tenant ${tenantId} was not archived (no-op)`);
        } else if (result.reason === "not-found") {
          io.error(`Tenant ${tenantId} not found in platform.tenants`);
          process.exitCode = 1;
        } else if (result.reason === "hard-deleted") {
          io.error(
            `Tenant ${tenantId} has been hard-deleted; restore requires backup rehydration (out of MVP-1 scope)`,
          );
          process.exitCode = 1;
        }
      } catch (err) {
        io.error(
          `tenant restore failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });

  tenant
    .command("hard-delete")
    .description(
      "Stage 2 of archival: DROP SCHEMA for tenants past retention (legal_hold blocks)",
    )
    .requiredOption(
      "--config <path>",
      "Path to a TS/JS module that default-exports a TenantCliContext { db, schemaManager }",
    )
    .option(
      "--retention-days <n>",
      "Retention window in days; tenants archived longer ago are eligible (default 30)",
      "30",
    )
    .option("--dry-run", "Print planned deletions without applying")
    .action(async (options: HardDeleteCommandOptions) => {
      try {
        const ctx = await loadContext(options.config);
        if (!ctx.schemaManager) {
          throw new Error(
            "TenantCliContext.schemaManager is required for `tenant hard-delete`",
          );
        }
        const days = options.retentionDays
          ? Number.parseInt(options.retentionDays, 10)
          : 30;
        const report = await runHardDeleteSweep(ctx.db, ctx.schemaManager, {
          retentionMs: days * 24 * 60 * 60 * 1000,
          ...(options.dryRun ? { dryRun: true } : {}),
        });
        printHardDeleteReport(report, options.dryRun ?? false, io.log);
        if (!report.allSucceeded) process.exitCode = 1;
      } catch (err) {
        io.error(
          `tenant hard-delete failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });

  tenant
    .command("doctor")
    .description(
      "Surface tenants with active legal-holds + drift between platform.tenants and tenant schemas",
    )
    .requiredOption(
      "--config <path>",
      "Path to a TS/JS module that default-exports a TenantCliContext { db }",
    )
    .option(
      "--retention-days <n>",
      "Retention window in days for the 'ready for hard delete' list (default 30)",
      "30",
    )
    .action(async (options: DoctorCommandOptions) => {
      try {
        const ctx = await loadContext(options.config);
        const days = options.retentionDays
          ? Number.parseInt(options.retentionDays, 10)
          : 30;
        const report = await runTenantDoctor(ctx.db, {
          retentionMs: days * 24 * 60 * 60 * 1000,
        });
        printDoctorReport(report, io.log);
      } catch (err) {
        io.error(
          `tenant doctor failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });
}

async function defaultLoadContext(configPath: string): Promise<TenantCliContext> {
  const abs = resolve(process.cwd(), configPath);
  const mod = (await import(pathToFileURL(abs).href)) as { default?: TenantCliContext };
  if (!mod.default) {
    throw new Error(
      `Tenant CLI config at "${configPath}" must default-export a TenantCliContext`,
    );
  }
  return mod.default;
}

function printMigrateReport(
  report: TenantMigrationsReport,
  dryRun: boolean,
  log: (msg: string) => void,
): void {
  const verb = dryRun ? "Would apply" : "Applied";
  for (const outcome of report.outcomes) {
    log(
      `[${outcome.tenantId}] ${outcome.schemaName}: ${verb} ${outcome.applied.length}, skipped ${outcome.alreadyApplied.length}, failed ${outcome.failures.length}`,
    );
    for (const f of outcome.failures) {
      log(`  ↳ ${f.migrationId}: ${f.reason}`);
    }
  }
  if (report.abortedAfter !== undefined) {
    log(`Aborted after tenant ${report.abortedAfter} (fail-fast)`);
  }
  log(
    `Done. ${report.outcomes.length} tenant(s). ${report.allSucceeded ? "All succeeded." : "Some failed — see per-tenant lines above."}`,
  );
}

function printHardDeleteReport(
  report: HardDeleteSweepReport,
  dryRun: boolean,
  log: (msg: string) => void,
): void {
  const verb = dryRun ? "Would hard-delete" : "Hard-deleted";
  if (dryRun) {
    log(`${report.candidates.length} tenant(s) eligible.`);
    for (const c of report.candidates) {
      log(
        `  ↳ ${verb} ${c.tenantId} (${c.schemaName}, archived at ${c.archivedAt.toISOString()})`,
      );
    }
  } else {
    for (const o of report.outcomes) {
      log(
        o.ok
          ? `${verb} ${o.tenantId} (${o.schemaName})`
          : `FAILED to hard-delete ${o.tenantId} (${o.schemaName}): ${o.reason}`,
      );
    }
  }
  if (report.blockedByLegalHold.length > 0) {
    log(
      `Blocked by legal_hold: ${report.blockedByLegalHold.length} tenant(s) — ${report.blockedByLegalHold.map((c) => c.tenantId).join(", ")}`,
    );
  }
  log(
    `Done. ${report.outcomes.length} processed. ${report.allSucceeded ? "All succeeded." : "Some failed — see per-tenant lines above."}`,
  );
}

function printDoctorReport(report: DoctorReport, log: (msg: string) => void): void {
  log(`Tenants: ${report.tenants.length}`);
  for (const t of report.tenants) {
    const hold = t.legalHold ? " [LEGAL HOLD]" : "";
    const arch = t.archivedAt ? ` archived=${t.archivedAt.toISOString()}` : "";
    log(`  • ${t.tenantId} (${t.slug}) status=${t.status}${arch}${hold}`);
  }

  if (report.legalHolds.length > 0) {
    log(``);
    log(`LEGAL HOLDS (${report.legalHolds.length}):`);
    for (const t of report.legalHolds) {
      log(`  • ${t.tenantId} (${t.slug})`);
    }
  }

  if (report.readyForHardDelete.length > 0) {
    log(``);
    log(`READY FOR HARD DELETE (${report.readyForHardDelete.length}) — run \`tenant hard-delete\`:`);
    for (const t of report.readyForHardDelete) {
      log(`  • ${t.tenantId} (${t.slug}) archived=${t.archivedAt?.toISOString()}`);
    }
  }

  if (report.orphanedSchemas.length > 0) {
    log(``);
    log(`ORPHANED SCHEMAS (${report.orphanedSchemas.length}) — no matching tenant row:`);
    for (const s of report.orphanedSchemas) log(`  • ${s}`);
  }

  if (report.missingSchemas.length > 0) {
    log(``);
    log(`MISSING SCHEMAS (${report.missingSchemas.length}) — tenant rows without DB schema:`);
    for (const m of report.missingSchemas) {
      log(`  • ${m.tenantId} (expected ${m.expectedSchema})`);
    }
  }
}
