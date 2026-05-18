/**
 * `starter-saas events <subcommand>` — event-bus operational commands per
 * ADR-0005 (D-45).
 *
 * Subcommands:
 *   - list-dlq — list `platform.event_dlq` entries
 *   - replay   — re-publish a DLQ entry through the bus
 *
 * Adopter wires their bus + DB into the `TenantCliContext.eventBus` field
 * (loaded via `--config <path>`).
 */

import { Command } from "commander";

import {
  listDlqEntries,
  replayDlqEntry,
  type OutboxDb,
} from "@starter-saas/event-bus";

import type { TenantCliContext } from "./tenant.js";

interface ListDlqOptions {
  config: string;
  includeReplayed?: boolean;
}

interface ReplayOptions {
  config: string;
  dlqId: string;
}

export function registerEventsCommands(
  program: Command,
  loadContext: (configPath: string) => Promise<TenantCliContext>,
  io: { log: (msg: string) => void; error: (msg: string) => void },
): void {
  const events = program
    .command("events")
    .description("Event-bus operational commands (per ADR-0005)");

  events
    .command("list-dlq")
    .description("List entries in `platform.event_dlq`")
    .requiredOption(
      "--config <path>",
      "Path to a module that default-exports a TenantCliContext { db }",
    )
    .option(
      "--include-replayed",
      "Include rows that already have a non-null replayed_at",
    )
    .action(async (options: ListDlqOptions) => {
      try {
        const ctx = await loadContext(options.config);
        const rows = await listDlqEntries(ctx.db as unknown as OutboxDb, {
          ...(options.includeReplayed ? { includeReplayed: true } : {}),
        });
        if (rows.length === 0) {
          io.log("No DLQ entries.");
          return;
        }
        io.log(`${rows.length} DLQ entr${rows.length === 1 ? "y" : "ies"}:`);
        for (const r of rows) {
          const replayed = r.replayedAt
            ? ` REPLAYED ${r.replayedAt.toISOString()}`
            : "";
          io.log(
            `  • ${r.id} [${r.consumerGroup}] ${r.topic}/${r.partitionKey} idempotency=${r.idempotencyKey} attempts=${r.attempts} failed=${r.failedAt.toISOString()}${replayed}`,
          );
          io.log(`      err: ${r.lastError}`);
        }
      } catch (err) {
        io.error(
          `events list-dlq failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });

  events
    .command("replay")
    .description(
      "Re-publish a DLQ entry through the event bus (caller must ensure the original failure mode is fixed first)",
    )
    .requiredOption(
      "--config <path>",
      "Path to a module that default-exports a TenantCliContext { db, eventBus }",
    )
    .requiredOption("--dlq-id <uuid>", "DLQ entry ID to replay")
    .action(async (options: ReplayOptions) => {
      try {
        const ctx = await loadContext(options.config);
        if (!ctx.eventBus) {
          throw new Error(
            "TenantCliContext.eventBus is required for `events replay`",
          );
        }
        const result = await replayDlqEntry(
          ctx.db as unknown as OutboxDb,
          ctx.eventBus,
          options.dlqId,
        );
        if (result.ok) {
          io.log(
            `Replayed DLQ ${options.dlqId} → topic=${result.entry?.topic} partitionKey=${result.entry?.partitionKey}`,
          );
        } else if (result.reason === "not-found") {
          io.error(`DLQ entry ${options.dlqId} not found`);
          process.exitCode = 1;
        } else if (result.reason === "already-replayed") {
          io.error(
            `DLQ entry ${options.dlqId} already replayed at ${result.entry?.replayedAt?.toISOString()}`,
          );
          process.exitCode = 1;
        }
      } catch (err) {
        io.error(
          `events replay failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });
}
