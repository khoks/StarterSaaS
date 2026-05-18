/**
 * Pino logger factory with PII redaction baked in per ADR-0006.
 *
 * Stdout in dev (human-readable when `pino-pretty` is wired by adopter; raw
 * JSON otherwise); the OTel Logs Bridge wiring lands in sub-PR #2 of
 * STORY-019 (adopter installs `pino-opentelemetry-transport` to route logs
 * via OTLP).
 *
 * The kit exposes the `createLogger(config)` factory + a `getLogger()`
 * accessor for module-scoped child loggers.
 */

import { pino, stdTimeFunctions, type Level, type Logger } from "pino";

import type { ObservabilityConfig } from "./config.js";
import { pinoRedactPaths } from "./pii.js";

export interface CreateLoggerOptions {
  /** Override level — defaults to "debug" in development, "info" otherwise. */
  level?: Level;
}

export function createLogger(
  config: ObservabilityConfig,
  options: CreateLoggerOptions = {},
): Logger {
  const isDev = config.environment === "development";
  const level = options.level ?? (isDev ? "debug" : "info");

  return pino({
    level,
    base: {
      service: config.serviceName,
      ...(config.serviceVersion !== undefined ? { version: config.serviceVersion } : {}),
      env: config.environment,
    },
    timestamp: stdTimeFunctions.isoTime,
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
    ...(config.pii.enabled
      ? {
          redact: {
            paths: pinoRedactPaths(config.pii.extraRedactedKeys),
            censor: "[REDACTED]",
          },
        }
      : {}),
  });
}

/** Singleton accessor — adopter calls `setRootLogger(...)` once at boot;
 *  module-scoped code calls `getLogger()` to grab the configured root or
 *  a child. */
let rootLogger: Logger | null = null;

export function setRootLogger(logger: Logger): void {
  rootLogger = logger;
}

export function getLogger(component?: string): Logger {
  // Fall back to a default Pino logger so module-load-time logging doesn't
  // crash. Adopters should call setRootLogger() before any real work runs.
  const logger: Logger = rootLogger ?? (rootLogger = pino({ level: "info" }));
  if (component) {
    return logger.child({ component });
  }
  return logger;
}

/** Test helper — resets the singleton so each test starts fresh. */
export function resetRootLogger(): void {
  rootLogger = null;
}
