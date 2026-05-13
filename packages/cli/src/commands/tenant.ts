/**
 * `starter-saas tenant <subcommand>` — tenant lifecycle commands per ADR-0004.
 *
 * Subcommand scope (STORY-015):
 *   - migrate  — apply Drizzle migrations across tenant schemas (sub-PR #2 — this PR)
 *   - restore  — flip soft-archived tenant back to active (sub-PR #3)
 *   - doctor   — surface legal-hold tenants + drift detection (sub-PR #3)
 *
 * The `migrate` action is library-driven: adopters provide a `migrate-context`
 * loader module (path passed via `--config <path>`) that default-exports a
 * `MigrateContext` with the DB + migrations array. The CLI imports it
 * dynamically + delegates to `runTenantMigrations` from `@starter-saas/tenancy`.
 */

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { Command } from "commander";

import {
  runTenantMigrations,
  type TenantDb,
  type TenantMigration,
  type TenantMigrationsReport,
} from "@starter-saas/tenancy";

export interface MigrateContext {
  db: TenantDb;
  migrations: readonly TenantMigration[];
}

interface MigrateCommandOptions {
  config: string;
  tenant?: string;
  parallelism?: string;
  failFast?: boolean;
  dryRun?: boolean;
}

export function registerTenantCommands(
  program: Command,
  /** Override hook for tests so we don't have to write+import a real config file. */
  loadContext: (configPath: string) => Promise<MigrateContext> = defaultLoadContext,
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
      "Path to a TS/JS module that default-exports a MigrateContext { db, migrations }",
    )
    .option("--tenant <id>", "Run migrations only for the given tenant ID")
    .option("--parallelism <n>", "Max tenants to migrate concurrently (default 5)", "5")
    .option("--fail-fast", "Abort on first per-tenant failure (default: continue-on-error)")
    .option("--dry-run", "Print planned migrations without applying")
    .action(async (options: MigrateCommandOptions) => {
      try {
        const ctx = await loadContext(options.config);
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
        printReport(report, options.dryRun ?? false, io.log);
        if (!report.allSucceeded) process.exitCode = 1;
      } catch (err) {
        io.error(
          `tenant migrate failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });

  tenant
    .command("restore <tenantId>")
    .description("Reverse a soft-archive within the retention window")
    .action(() => {
      io.error(
        "starter-saas tenant restore: not implemented yet (STORY-015 sub-PR #3)",
      );
      process.exitCode = 2;
    });

  tenant
    .command("doctor")
    .description(
      "Surface tenants with active legal-holds + report drift between platform.tenants and tenant schemas",
    )
    .action(() => {
      io.error(
        "starter-saas tenant doctor: not implemented yet (STORY-015 sub-PR #3)",
      );
      process.exitCode = 2;
    });
}

async function defaultLoadContext(configPath: string): Promise<MigrateContext> {
  const abs = resolve(process.cwd(), configPath);
  const mod = (await import(pathToFileURL(abs).href)) as { default?: MigrateContext };
  if (!mod.default) {
    throw new Error(
      `Migrate config at "${configPath}" must default-export a MigrateContext { db, migrations }`,
    );
  }
  return mod.default;
}

function printReport(
  report: TenantMigrationsReport,
  dryRun: boolean,
  log: (msg: string) => void,
): void {
  const verb = dryRun ? "Would apply" : "Applied";
  for (const outcome of report.outcomes) {
    const summary = `[${outcome.tenantId}] ${outcome.schemaName}: ${verb} ${outcome.applied.length}, skipped ${outcome.alreadyApplied.length}, failed ${outcome.failures.length}`;
    log(summary);
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
