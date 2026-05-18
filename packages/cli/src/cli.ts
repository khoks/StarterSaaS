/**
 * Top-level CLI factory — builds the Commander tree.
 *
 * Exposed as a factory (not auto-executed) so tests can construct an isolated
 * Command instance + assert on `--help` output without hijacking process.argv.
 */

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { Command } from "commander";

import { registerEventsCommands } from "./commands/events.js";
import { registerSagasCommands } from "./commands/sagas.js";
import { registerTenantCommands, type TenantCliContext } from "./commands/tenant.js";
import { CLI_VERSION } from "./version.js";

export interface BuildCliOverrides {
  /** Override the adopter-config loader — tests inject a pre-built context. */
  loadContext?: (configPath: string) => Promise<TenantCliContext>;
  /** Override stdout / stderr sinks — tests capture into arrays. */
  io?: { log: (msg: string) => void; error: (msg: string) => void };
}

export function buildCli(overrides: BuildCliOverrides = {}): Command {
  const program = new Command();

  program
    .name("starter-saas")
    .description(
      "StarterSaaS CLI — init / deploy / tenant / events / sagas / teardown / doctor (per D-42 + ADR-0004 + ADR-0005)",
    )
    .version(CLI_VERSION, "-v, --version", "Print the kit version and exit");

  const loadContext = overrides.loadContext ?? defaultLoadContext;
  const io = overrides.io ?? {
    // eslint-disable-next-line no-console
    log: (msg) => console.log(msg),
    // eslint-disable-next-line no-console
    error: (msg) => console.error(msg),
  };

  registerTenantCommands(program, loadContext, io);
  registerEventsCommands(program, loadContext, io);
  registerSagasCommands(program, loadContext, io);

  return program;
}

async function defaultLoadContext(configPath: string): Promise<TenantCliContext> {
  const abs = resolve(process.cwd(), configPath);
  const mod = (await import(pathToFileURL(abs).href)) as { default?: TenantCliContext };
  if (!mod.default) {
    throw new Error(
      `CLI config at "${configPath}" must default-export a TenantCliContext`,
    );
  }
  return mod.default;
}
