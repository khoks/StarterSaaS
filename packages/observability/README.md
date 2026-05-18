# @starter-saas/observability

Observability foundation per [ADR-0006](../../docs/architecture/ADR-0006-observability.md). MVP-1 sub-PR #1 of [STORY-019](../../project/stories/STORY-019-otel-langfuse-pino-foundation.md) — the core SDK + helpers; cloud-native backends + Fastify auto-instrumentation + cost-rollup consumer land in subsequent sub-PRs.

## What's in this package

- **`bootstrapObservability(config)`** — initializes the OTel Node SDK with the kit's adaptive sampler + a `Resource` carrying `service.name` / `service.version` / `deployment.environment`. Idempotent. Returns `{ sdk, tracer, inMemoryExporter }`.
- **`AdaptiveSampler`** — routes spans flagged `app.error_path = true` to the error sampling rate (default 100%) and the rest to the healthy rate (default 1%). Adopter-tunable per ADR-0006 side-pick.
- **`createLogger(config)` / `getLogger(component?)`** — Pino factory with built-in PII redaction (`password`, `apiKey`, `token`, `cookie`, `ssn`, `credit_card`, `email`, etc.) + adopter-extensible via `pii.extraRedactedKeys`. Outputs structured JSON to stdout; OTel Logs Bridge wiring lands in sub-PR #2.
- **`withGenAiSpan(opts, fn)` + `recordGenAiUsage(span, usage)` + `recordPrompt(span, text, opts)`** — the integration point STORY-022's LLM Gateway will use. Wraps an LLM call in a span attributed with OTel GenAI semconv names (`gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.{input,output,cache_read}_tokens`, `gen_ai.response.id`, `gen_ai.response.finish_reasons`, `gen_ai.cost.usd`). Prompt capture follows the kit's preview-by-default discipline.
- **`withTenantContext(tenantId, fn)` + `TenantContextSpanProcessor`** — async-local tenant ID propagation. Every span inside a tenant-scoped request picks up `tenant.id` automatically — cost dashboards (sub-PR #3) + per-tenant budget enforcement (STORY-020) join on it.
- **PII redaction helpers** — `makeRedactionMatcher(extras)`, `redactObject`, `redactSpanAttributes`, `pinoRedactPaths`.

## Quick start

```typescript
import {
  ObservabilityConfigSchema,
  bootstrapObservability,
  createLogger,
  setRootLogger,
  withGenAiSpan,
  recordGenAiUsage,
  recordPrompt,
  withTenantContext,
} from "@starter-saas/observability";

const config = ObservabilityConfigSchema.parse({
  serviceName: "my-app",
  serviceVersion: "1.2.3",
  environment: process.env.NODE_ENV ?? "development",
});

bootstrapObservability(config);
setRootLogger(createLogger(config));

// Adopter code that uses the GenAI span (typical LLM Gateway integration):
await withTenantContext(tenantId, async () => {
  return withGenAiSpan(
    {
      system: "anthropic",
      requestModel: "claude-opus-4-7",
      tenantId,
      featureId: "chat",
    },
    async (span) => {
      const prompt = "Summarize the user's last 10 emails…";
      recordPrompt(span, prompt, {
        mode: config.llm.promptCapture,
        previewChars: config.llm.promptPreviewChars,
      });
      const result = await callAnthropic(prompt);
      recordGenAiUsage(span, {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
        responseModel: result.model,
        finishReasons: [result.stop_reason],
        costUsd: pricingTable.compute(result),
      });
      return result;
    },
  );
});
```

## ADR-0006 side-picks locked here

| Setting | Default | Adopter-tunable |
|---|---|---|
| Trace sampling — error path | 100% | Yes |
| Trace sampling — healthy path | 1% (adaptive) | Yes |
| PII scrubbing | Required (enabled = true) | Yes (off in dev only) |
| LLM prompt logging | Preview (head + tail + content hash) | Adopter opts into "full" |
| Logs retention | 30 days | Yes |
| Traces retention | 7 days | Yes |
| Metrics retention | 90 days | Yes |
| Cost-rollup retention | 90 days | Yes |

## What's coming

- **Sub-PR #2 of STORY-019** — Fastify plugin (auto-spans per request) + Drizzle query instrumentation + Pino → OTel Logs Bridge (so adopter's logs flow via OTLP)
- **Sub-PR #3 of STORY-019** — Cost-rollup consumer + `platform.llm_call` event types (STORY-020 dashboard reads from `platform.observability_events`)
- **Cloud-native backend adapters** (`@starter-saas/observability-cloudwatch` / `@starter-saas/observability-cloud-logging`) — ship alongside the EPIC-008 deploy infra
- **Langfuse integration** — wires alongside the LLM Gateway (STORY-022)

## Status

**MVP-1 sub-PR #1** — core SDK + helpers landed; rest of STORY-019 in flight.
