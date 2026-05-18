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

  it("registers `tenant migrate`, `archive`, `restore`, `hard-delete`, `doctor` subcommands", () => {
    const cli = buildCli();
    const tenant = cli.commands.find((c) => c.name() === "tenant");
    const subs = tenant?.commands.map((c) => c.name()) ?? [];
    expect(subs).toEqual(
      expect.arrayContaining(["migrate", "archive", "restore", "hard-delete", "doctor"]),
    );
  });

  it("`tenant archive` declares --reason / --requesting-user / --config", () => {
    const cli = buildCli();
    const archive = cli.commands
      .find((c) => c.name() === "tenant")
      ?.commands.find((c) => c.name() === "archive");
    const optionNames = archive?.options.map((o) => o.long) ?? [];
    expect(optionNames).toEqual(
      expect.arrayContaining(["--config", "--reason", "--requesting-user"]),
    );
  });

  it("`tenant hard-delete` declares --retention-days / --dry-run / --config", () => {
    const cli = buildCli();
    const hd = cli.commands
      .find((c) => c.name() === "tenant")
      ?.commands.find((c) => c.name() === "hard-delete");
    const optionNames = hd?.options.map((o) => o.long) ?? [];
    expect(optionNames).toEqual(
      expect.arrayContaining(["--config", "--retention-days", "--dry-run"]),
    );
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

  it("registers the `events` command group with list-dlq + replay subcommands", () => {
    const cli = buildCli();
    const events = cli.commands.find((c) => c.name() === "events");
    expect(events).toBeDefined();
    const subs = events?.commands.map((c) => c.name()) ?? [];
    expect(subs).toEqual(expect.arrayContaining(["list-dlq", "replay"]));
  });

  it("`events replay` declares --dlq-id + --config", () => {
    const cli = buildCli();
    const replay = cli.commands
      .find((c) => c.name() === "events")
      ?.commands.find((c) => c.name() === "replay");
    const optionNames = replay?.options.map((o) => o.long) ?? [];
    expect(optionNames).toEqual(expect.arrayContaining(["--config", "--dlq-id"]));
  });

  it("registers the `sagas` command group with list + cancel subcommands", () => {
    const cli = buildCli();
    const sagas = cli.commands.find((c) => c.name() === "sagas");
    expect(sagas).toBeDefined();
    const subs = sagas?.commands.map((c) => c.name()) ?? [];
    expect(subs).toEqual(expect.arrayContaining(["list", "cancel"]));
  });

  it("`sagas cancel` declares --saga-id + --reason + --config", () => {
    const cli = buildCli();
    const cancel = cli.commands
      .find((c) => c.name() === "sagas")
      ?.commands.find((c) => c.name() === "cancel");
    const optionNames = cancel?.options.map((o) => o.long) ?? [];
    expect(optionNames).toEqual(
      expect.arrayContaining(["--config", "--saga-id", "--reason"]),
    );
  });
});
