/**
 * Adopter-facing observability config — Zod-validated per D-25.
 *
 * Locked side-picks from ADR-0006 §"Side picks":
 *   - PII scrubbing REQUIRED by default (off in dev only)
 *   - Trace sampling: 100% errors / 1% healthy paths (adopter-tunable)
 *   - LLM prompt logging: token counts + first/last 100 chars + content hash;
 *     full prompt logging is dev-opt-in only
 *   - Retention: logs 30d / traces 7d / metrics 90d / cost-rollups 90d
 */

import { z } from "zod";

export const ObservabilitySamplingConfigSchema = z.object({
  /** Sampling rate for spans on a healthy code path. Range [0, 1]. */
  healthyRate: z.number().min(0).max(1).default(0.01),
  /** Sampling rate for spans where the root has recorded an error. Range [0, 1]. */
  errorRate: z.number().min(0).max(1).default(1.0),
});

export const ObservabilityPiiConfigSchema = z.object({
  /** Master switch. Required = true at MVP-1; set false only in dev. */
  enabled: z.boolean().default(true),
  /** Additional adopter-supplied sensitive keys to redact (in addition to
   *  the kit's built-in patterns). Case-insensitive substring match against
   *  log object key paths + OTel attribute names. */
  extraRedactedKeys: z.array(z.string()).default([]),
});

export const ObservabilityLlmConfigSchema = z.object({
  /** "preview" (default) ships token counts + first/last 100 chars + content hash.
   *  "full" ships the entire prompt + response. Adopter MUST opt into "full"
   *  consciously — typically dev-only. */
  promptCapture: z.enum(["preview", "full"]).default("preview"),
  /** How many chars of head/tail to keep in preview mode. */
  promptPreviewChars: z.number().int().min(0).max(2000).default(100),
});

export const ObservabilityRetentionConfigSchema = z.object({
  logsDays: z.number().int().min(1).default(30),
  tracesDays: z.number().int().min(1).default(7),
  metricsDays: z.number().int().min(1).default(90),
  costRollupsDays: z.number().int().min(1).default(90),
});

export const ObservabilityConfigSchema = z.object({
  /** Service identifier — populates `service.name` resource attribute. */
  serviceName: z.string().min(1).default("starter-saas"),
  /** Optional version tag — populates `service.version`. */
  serviceVersion: z.string().optional(),
  /** Deployment environment — "production" | "staging" | "development" | adopter-string.
   *  Disables full prompt logging when not "development". */
  environment: z.string().default("development"),
  sampling: ObservabilitySamplingConfigSchema.default({}),
  pii: ObservabilityPiiConfigSchema.default({}),
  llm: ObservabilityLlmConfigSchema.default({}),
  retention: ObservabilityRetentionConfigSchema.default({}),
});

export type ObservabilityConfig = z.infer<typeof ObservabilityConfigSchema>;
export type ObservabilitySamplingConfig = z.infer<typeof ObservabilitySamplingConfigSchema>;
export type ObservabilityPiiConfig = z.infer<typeof ObservabilityPiiConfigSchema>;
export type ObservabilityLlmConfig = z.infer<typeof ObservabilityLlmConfigSchema>;
export type ObservabilityRetentionConfig = z.infer<typeof ObservabilityRetentionConfigSchema>;
