/**
 * `starter-saas sagas <subcommand>` — saga operational commands per ADR-0005.
 *
 * Subcommands:
 *   - list    — list saga instances (filterable by status)
 *   - cancel  — force-cancel an in-flight saga (status: failed, reason: manual)
 *
 * Adopter wires their `SagaStore` impl into `TenantCliContext.sagaStore`.
 */

import { Command } from "commander";

import { cancelSaga, type SagaStatus } from "@starter-saas/saga";

import type { TenantCliContext } from "./tenant.js";

interface ListOptions {
  config: string;
  status?: string;
  sagaName?: string;
}

interface CancelOptions {
  config: string;
  sagaId: string;
  reason?: string;
}

const VALID_STATUSES: readonly SagaStatus[] = [
  "pending",
  "in-progress",
  "completed",
  "compensating",
  "compensated",
  "failed",
];

export function registerSagasCommands(
  program: Command,
  loadContext: (configPath: string) => Promise<TenantCliContext>,
  io: { log: (msg: string) => void; error: (msg: string) => void },
): void {
  const sagas = program
    .command("sagas")
    .description("Saga operational commands (per ADR-0005)");

  sagas
    .command("list")
    .description("List saga instances")
    .requiredOption(
      "--config <path>",
      "Path to a module that default-exports a TenantCliContext { sagaStore }",
    )
    .option("--status <status>", "Filter by status (pending | in-progress | completed | compensating | compensated | failed)")
    .option("--saga-name <name>", "Filter by saga name (e.g. 'tenant.provisioning')")
    .action(async (options: ListOptions) => {
      try {
        const ctx = await loadContext(options.config);
        if (!ctx.sagaStore) {
          throw new Error(
            "TenantCliContext.sagaStore is required for `sagas list`",
          );
        }
        const filter: { status?: SagaStatus; sagaName?: string } = {};
        if (options.status !== undefined) {
          if (!VALID_STATUSES.includes(options.status as SagaStatus)) {
            throw new Error(
              `Invalid --status ${options.status}. Must be one of: ${VALID_STATUSES.join(", ")}`,
            );
          }
          filter.status = options.status as SagaStatus;
        }
        if (options.sagaName !== undefined) filter.sagaName = options.sagaName;
        const rows = await ctx.sagaStore.list(filter);
        if (rows.length === 0) {
          io.log("No saga instances match the filter.");
          return;
        }
        io.log(`${rows.length} saga instance${rows.length === 1 ? "" : "s"}:`);
        for (const r of rows) {
          io.log(
            `  • ${r.instanceId} ${r.sagaName} status=${r.status} step=${r.currentStep} started=${r.startedAt.toISOString()}${
              r.failureReason ? ` failure=${r.failureReason}` : ""
            }`,
          );
        }
      } catch (err) {
        io.error(
          `sagas list failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });

  sagas
    .command("cancel")
    .description("Force-cancel an in-flight saga (status: failed; does NOT walk compensations)")
    .requiredOption(
      "--config <path>",
      "Path to a module that default-exports a TenantCliContext { sagaStore }",
    )
    .requiredOption("--saga-id <uuid>", "Saga instance ID")
    .option("--reason <text>", "Custom cancel reason (default: 'manual-cancel')")
    .action(async (options: CancelOptions) => {
      try {
        const ctx = await loadContext(options.config);
        if (!ctx.sagaStore) {
          throw new Error(
            "TenantCliContext.sagaStore is required for `sagas cancel`",
          );
        }
        const result = await cancelSaga(
          ctx.sagaStore,
          options.sagaId,
          options.reason ?? "manual-cancel",
        );
        if (result.ok) {
          io.log(
            `Canceled saga ${options.sagaId} (was ${result.instance?.sagaName})`,
          );
        } else if (result.reason === "not-found") {
          io.error(`Saga ${options.sagaId} not found`);
          process.exitCode = 1;
        } else if (result.reason === "already-terminal") {
          io.error(
            `Saga ${options.sagaId} is already terminal (status: ${result.instance?.status})`,
          );
          process.exitCode = 1;
        }
      } catch (err) {
        io.error(
          `sagas cancel failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });
}
