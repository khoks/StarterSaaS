/**
 * @starter-saas/observability — observability foundation per ADR-0006.
 *
 * Public surface (MVP-1 sub-PR #1):
 *   - `bootstrapObservability(config)` — initializes the OTel SDK
 *   - `shutdownObservability()` — flushes + closes the SDK
 *   - `createLogger(config)` + `getLogger(component?)` — Pino with PII redaction
 *   - `AdaptiveSampler` + `errorPathAttributes()` — adopter marks error spans
 *   - `withGenAiSpan(opts, fn)` + `recordGenAiUsage(span, usage)` + `recordPrompt(...)`
 *     — the STORY-022 LLM Gateway integration point
 *   - `withTenantContext(tenantId, fn)` + `TenantContextSpanProcessor`
 *     — propagates tenant.id onto every span in the async call stack
 *   - PII redactor (`makeRedactionMatcher`, `redactObject`, `redactSpanAttributes`)
 *   - Test helpers (`getCapturedSpans`, `resetCapturedSpans`, `resetRootLogger`)
 *
 * Subsequent sub-PRs of STORY-019:
 *   - Fastify plugin + Drizzle query instrumentation + Pino → OTel Logs Bridge
 *   - Cost-rollup consumer + `platform.llm_call` event types
 *
 * Cloud-native backend adapters (`@starter-saas/observability-cloudwatch` etc.)
 * land in separate packages once the deploy infra (EPIC-008) exists.
 */

export const PACKAGE_NAME = "@starter-saas/observability" as const;

export {
  type BootstrapObservabilityOptions,
  type BootstrapResult,
  bootstrapObservability,
  getCapturedSpans,
  resetCapturedSpans,
  shutdownObservability,
} from "./otel.js";

export {
  type CreateLoggerOptions,
  createLogger,
  getLogger,
  resetRootLogger,
  setRootLogger,
} from "./logger.js";

export {
  type AdaptiveSamplerOptions,
  AdaptiveSampler,
  ERROR_PATH_ATTRIBUTE,
  errorPathAttributes,
  markActiveSpanErrorPath,
  shouldSampleDecisionToBool,
} from "./sampler.js";

export {
  GEN_AI_ATTRIBUTES,
  type GenAiSpanOptions,
  type GenAiUsage,
  recordGenAiUsage,
  recordPrompt,
  withGenAiSpan,
} from "./genai.js";

export {
  type TenantContextSpanProcessor as TenantContextSpanProcessorType,
  TenantContextSpanProcessor,
  getActiveTracer,
  getCurrentTenantId,
  setSpanTenant,
  withTenantContext,
} from "./tenant-context.js";

export {
  BUILTIN_REDACTED_KEYS,
  REDACTED_PLACEHOLDER,
  makeRedactionMatcher,
  pinoRedactPaths,
  redactObject,
  redactSpanAttributes,
} from "./pii.js";

export { hashRecipient as hashContent } from "./hash.js";

export {
  type ObservabilityConfig,
  type ObservabilityLlmConfig,
  type ObservabilityPiiConfig,
  type ObservabilityRetentionConfig,
  type ObservabilitySamplingConfig,
  ObservabilityConfigSchema,
  ObservabilityLlmConfigSchema,
  ObservabilityPiiConfigSchema,
  ObservabilityRetentionConfigSchema,
  ObservabilitySamplingConfigSchema,
} from "./config.js";
