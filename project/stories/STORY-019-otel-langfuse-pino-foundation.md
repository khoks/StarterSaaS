---
id: STORY-019
title: OTel SDK + GenAI semconv + Pino + Langfuse — observability foundation
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-005
phase: mvp
tags: [mvp, observability, otel, langfuse, pino]
created: 2026-05-06
updated: 2026-05-06
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
