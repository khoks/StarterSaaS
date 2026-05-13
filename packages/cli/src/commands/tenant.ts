/**
 * `starter-saas tenant <subcommand>` — tenant lifecycle commands per ADR-0004.
 *
 * Subcommand scope (STORY-015):
 *   - migrate  — apply Drizzle migrations across tenant schemas (sub-PR #2)
 *   - restore  — flip soft-archived tenant back to active (sub-PR #4)
 *   - doctor   — surface legal-hold tenants + drift detection (sub-PR #4)
 *
 * This file ships placeholders; subsequent sub-PRs wire the actual logic.
 */

import { Command } from "commander";

export function registerTenantCommands(program: Command): void {
  const tenant = program
    .command("tenant")
    .description("Tenant lifecycle commands (per ADR-0004)");

  tenant
    .command("migrate")
    .description(
      "Apply Drizzle migrations across tenant schemas (default 5-parallel, continue-on-error)",
    )
    .option("--tenant <id>", "Run migrations only for the given tenant ID")
    .option("--parallelism <n>", "Max tenants to migrate concurrently (default 5)", "5")
    .option("--fail-fast", "Abort on first per-tenant failure (default: continue-on-error)")
    .option("--dry-run", "Print planned migrations without applying")
    .action(() => {
      // Wiring lands in STORY-015 sub-PR #2.
      // eslint-disable-next-line no-console
      console.error(
        "starter-saas tenant migrate: not implemented yet (STORY-015 sub-PR #2)",
      );
      process.exitCode = 2;
    });

  tenant
    .command("restore <tenantId>")
    .description("Reverse a soft-archive within the retention window")
    .action(() => {
      // eslint-disable-next-line no-console
      console.error(
        "starter-saas tenant restore: not implemented yet (STORY-015 sub-PR #4)",
      );
      process.exitCode = 2;
    });

  tenant
    .command("doctor")
    .description(
      "Surface tenants with active legal-holds + report drift between platform.tenants and tenant schemas",
    )
    .action(() => {
      // eslint-disable-next-line no-console
      console.error(
        "starter-saas tenant doctor: not implemented yet (STORY-015 sub-PR #4)",
      );
      process.exitCode = 2;
    });
}
