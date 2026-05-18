---
id: STORY-019
title: OTel SDK + GenAI semconv + Pino + Langfuse — observability foundation
type: story
status: in-progress
priority: P0
estimate: L
parent: EPIC-005
phase: mvp
tags: [mvp, observability, otel, langfuse, pino]
created: 2026-05-06
updated: 2026-05-14
---

## Description

Wire up the observability foundation per [ADR-0006](../../docs/architecture/ADR-0006-observability.md). OTel SDK with GenAI semantic conventions; Pino → OTel Logs Bridge for structured JSON logging; OTel auto-instrumentation for Fastify + Drizzle + Pulumi (deploy-time); cloud-native backend default per [D-41](../../docs/decisions/DECISIONS_LOG.md) (CloudWatch on AWS, Cloud Logging on GCP); Langfuse SDK integrated alongside for LLM-app deep-dive (agent flows, LangGraph node tracing, prompt-response capture, eval framework). Adaptive trace sampling (100% errors, 1% healthy paths, adopter-tunable). PII scrubbing required by default (Pino redactor + OTel attribute redactor).

## Acceptance criteria

- [ ] OTel SDK initialized at app boot with GenAI semconv
- [ ] Pino → OTel Logs Bridge configured; structured JSON in dev (stdout), OTLP in prod
- [ ] Auto-instrumentation: Fastify request spans, Drizzle query spans, Pulumi deploy spans
- [ ] Cloud-native backend adapter (CloudWatch / Cloud Logging) selected per `cloud:` config
- [ ] Langfuse SDK integrated in `@starter-saas/llm-gateway` (per STORY-022); every LLM call gets a trace
- [ ] Adaptive sampling rate: 100% errors / 1% healthy paths (adopter-tunable)
- [ ] PII redactor: known sensitive keys (passwords, API keys, full email, SSN) scrubbed
- [ ] LLM prompt content: token counts + first/last 100 chars + content hash by default; full prompt logging is dev-opt-in only
- [ ] Retention defaults: logs 30d / traces 7d / metrics 90d / cost-rollups 90d (adopter-tunable)
- [ ] Integration test: request → Fastify span + Drizzle spans + (if LLM called) GenAI span + Langfuse trace → all visible in cloud-native backend

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: STORY-020 (cost dashboards depend on cost events flowing); STORY-021 (status page reads incidents from observability)
- Blocked by: STORY-016 (Fastify gateway must exist for instrumentation)

## Related

- ADRs: [ADR-0006](../../docs/architecture/ADR-0006-observability.md)
- Decisions: D-41, D-46

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
- 2026-05-14 — picked up. EPIC-004 closed (gateway + event bus + notifications); now the AI cost discipline story. Sub-PR plan: (1) core `@starter-saas/observability` package (OTel SDK + adaptive sampler + Pino with PII redactor + GenAI span helpers + tenant-context propagation) — the contract STORY-022's LLM Gateway will hook into; (2) Fastify plugin + Drizzle instrumentation + Pino → OTel Logs Bridge — wires the gateway; (3) cost-rollup consumer + `platform.llm_call` event types — feeds STORY-020's cost dashboards.
- 2026-05-14 — **Sub-PR #1 in progress**: foundation. New `@starter-saas/observability` package with: (1) Zod `ObservabilityConfigSchema` (samplerRates / piiEnabled+extras / promptCapture+previewChars / retention defaults — all ADR-0006 side-picks); (2) `pii.ts` PII redactor (18 built-in sensitive key patterns + adopter extensions; `makeRedactionMatcher` / `redactObject` recursive / `redactSpanAttributes` for OTel attrs / `pinoRedactPaths` generator); (3) `AdaptiveSampler` routing `app.error_path = true` spans to the error rate, others to healthy rate (wraps `TraceIdRatioBasedSampler`); (4) `createLogger(config)` Pino factory with redaction baked in + `getLogger(component?)` singleton accessor; (5) `bootstrapObservability(config)` initializes the OTel Node SDK (resource carries service.name + version + environment; `autoDetectResources: false` to avoid async detection races; default `InMemorySpanExporter` for dev/tests); (6) `withGenAiSpan(opts, fn)` + `recordGenAiUsage(span, usage)` + `recordPrompt(span, text, opts)` — the LLM Gateway integration point with OTel GenAI semconv attributes (`gen_ai.system` / `gen_ai.request.model` / `gen_ai.usage.{input,output,cache_read}_tokens` / `gen_ai.response.id|model|finish_reasons` / `gen_ai.cost.usd`) + kit-extension prompt-preview attributes; (7) `withTenantContext(tenantId, fn)` async-local propagation + `TenantContextSpanProcessor` stamping `tenant.id` on every span. **34 new tests**: 5 config (defaults + overrides + bounds), 11 PII (matcher + object recursion + span attrs + Pino paths), 5 sampler (error-path 100% + healthy 0% + non-trivial-rate distribution + toString), 6 logger (factory + getLogger singleton + child component), 7 OTel integration (GenAI span capture + preview-mode prompt PII discipline + full-mode opt-in + exception+ERROR status + tenant context processor + idempotent bootstrap). **Total test count: 313** (48 auth + 19 saga + 39 notifications + 10 event-bus + 26 gateway + 10 cli + 5 starter + 122 tenancy + 34 observability). Typecheck + build + test green across 15 packages. OTel SDK pinned to 1.28 / sdk-node 0.55 to align with NodeSDK's bundled sdk-trace-base version.
