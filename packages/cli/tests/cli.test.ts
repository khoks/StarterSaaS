/**
 * `@starter-saas/cli` smoke tests — verify the Commander tree exposes the
 * expected commands + flags. Subsequent sub-PRs of STORY-015 fill in the
 * per-subcommand behavior.
 */

import { describe, expect, it } from "vitest";

import { CLI_VERSION, buildCli } from "../src/index.js";

describe("buildCli() — top-level program", () => {
  it("exposes the kit version", () => {
    const cli = buildCli();
    expect(cli.version()).toBe(CLI_VERSION);
  });

  it("registers the `tenant` command group", () => {
    const cli = buildCli();
    const tenant = cli.commands.find((c) => c.name() === "tenant");
    expect(tenant).toBeDefined();
  });

  it("registers `tenant migrate`, `tenant restore`, `tenant doctor` subcommands", () => {
    const cli = buildCli();
    const tenant = cli.commands.find((c) => c.name() === "tenant");
    const subs = tenant?.commands.map((c) => c.name()) ?? [];
    expect(subs).toEqual(expect.arrayContaining(["migrate", "restore", "doctor"]));
  });

  it("`tenant migrate` declares ADR-0004 §1 flags (--tenant / --parallelism / --fail-fast / --dry-run)", () => {
    const cli = buildCli();
    const migrate = cli.commands
      .find((c) => c.name() === "tenant")
      ?.commands.find((c) => c.name() === "migrate");
    const optionNames = migrate?.options.map((o) => o.long) ?? [];
    expect(optionNames).toEqual(
      expect.arrayContaining(["--tenant", "--parallelism", "--fail-fast", "--dry-run"]),
    );
  });
});
