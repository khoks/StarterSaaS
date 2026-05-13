/**
 * Top-level CLI factory — builds the Commander tree.
 *
 * Exposed as a factory (not auto-executed) so tests can construct an isolated
 * Command instance + assert on `--help` output without hijacking process.argv.
 */

import { Command } from "commander";

import { registerTenantCommands } from "./commands/tenant.js";
import { CLI_VERSION } from "./version.js";

export function buildCli(): Command {
  const program = new Command();

  program
    .name("starter-saas")
    .description(
      "StarterSaaS CLI — init / deploy / tenant / teardown / doctor (per D-42 + ADR-0004)",
    )
    .version(CLI_VERSION, "-v, --version", "Print the kit version and exit");

  // Subcommand groups — wired up incrementally across Phase D stories.
  registerTenantCommands(program);

  // `init`, `deploy`, `teardown`, `doctor` lifecycle commands land later
  // (STORY-016 territory for the deploy CLI; here we only ship `tenant`).

  return program;
}
