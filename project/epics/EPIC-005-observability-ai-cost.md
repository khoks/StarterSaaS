---
id: EPIC-005
title: Observability + AI Cost — OTel + Langfuse + cost dashboards + budget enforcement + status page
type: epic
status: backlog
priority: P0
phase: mvp
tags: [mvp, observability, llm-cost, budgets, status-page]
created: 2026-05-05
updated: 2026-05-05
---

## Goal

Ship the **observability + cost-discipline foundation** for MVP-1: OTel + GenAI semconv + Langfuse for LLM-app deep-dive + cost dashboards + per-tenant LLM budget enforcement + built-in status page. AI-first claim is hollow without measurable AI behavior + bounded AI cost.

## Capabilities (per [docs/roadmap/MVP.md](../../docs/roadmap/MVP.md))

- **Observability stack** ([D-46](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0006](../../docs/architecture/ADR-0006-observability.md)) — OTel SDK + GenAI semantic conventions + Pino → OTel Logs Bridge + auto-instrumentation (Fastify / Drizzle / Pulumi); cloud-native backend MVP-1 (CloudWatch / Cloud Logging per D-41); **Langfuse** alongside for LLM-app deep-dive (agent flows / LangGraph / prompt-response capture / eval framework); adaptive sampling (100% errors / 1% healthy)
- **AI cost + budget enforcement** ([D-38](../../docs/decisions/DECISIONS_LOG.md) / [D-46](../../docs/decisions/DECISIONS_LOG.md)) — themed React admin dashboard at `/admin/observability` (RBAC-gated to platform admins); breakdowns: per-provider / per-tenant / per-feature / per-time-period / budget consumed % / cache hit rate / token-distribution histogram; storage in `platform.observability_events` (rolled up by event-bus consumer reading `platform.llm_call`); `platform.tenant_budgets` with hard/soft 80% defaults
- **Status page** ([D-49](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0017](../../docs/architecture/ADR-0017-status-brand-admin.md)) — built-in lightweight self-hosted (read-only, auto-updated from observability incidents) + Instatus managed adapter; 4-tier severity; subscribes to `platform.incident` topic on event bus

## Scope

- OTel SDK integration in Fastify gateway + Drizzle data layer
- GenAI semconv attributes on every LLM call (tokens, costs, providers, cache hit)
- Langfuse SDK integration in `@starter-saas/llm-gateway` (every LLM call gets a Langfuse trace alongside OTel span)
- Pino redactor + OTel attribute redactor for PII (passwords, API keys, full email, SSN; LLM prompts NOT fully logged — token counts + first/last 100 chars + content hash)
- Cost rollup consumer subscribed to `platform.llm_call` topic
- Cost dashboard React components in `packages/observability-dashboards`
- Budget enforcer middleware in `@starter-saas/llm-gateway` (checks `platform.tenant_budgets` before every LLM call)
- Default kit alerts (deploy failure / saga DLQ growth / budget breach / error rate spike) → adopter webhook config
- Built-in status page (Next.js) deployed to status subdomain via Pulumi
- Instatus adapter (push incident events to Instatus API)

## Out of scope (deferred per MVP.md § Out of scope)

- Self-hosted Grafana stack adapter (v1+)
- Datadog / New Relic / Honeycomb adapters (v1+)
- Atlassian Statuspage / Better Stack / Cachet status page adapters (v1+)
- Per-tenant custom dashboards (v1+)
- Splunk / DataDog log integration (v1+)
- Tracing-based cost optimization recommendations (v2+)

## Stories under this Epic

(Drafted in [STORY-012](../stories/STORY-012-mvp1-scope-lockdown.md) Q2; ≥3 expected.)

## Exit criteria

- [ ] OTel spans emit on every Fastify request + Drizzle query + LLM call
- [ ] Langfuse traces capture every LLM call with full prompt + response (PII-scrubbed)
- [ ] Cost rollup consumer aggregates `platform.llm_call` events into `platform.observability_events`
- [ ] Cost dashboard renders: per-provider, per-tenant, per-feature, budget consumed %, cache hit rate
- [ ] Per-tenant budget enforcement: 80% soft → warning event; 100% hard → `BUDGET_EXCEEDED` error
- [ ] PII scrubbing: known patterns scrubbed in logs + traces by default
- [ ] Adaptive sampling: errors 100%, healthy 1%
- [ ] Built-in status page deployed; auto-updates from incidents on event bus
- [ ] Instatus adapter pushes incident updates correctly
- [ ] Default kit alerts fire correctly via webhook
- [ ] Integration test: LLM call → OTel + Langfuse traces → cost event on bus → rollup updates → dashboard reflects → budget breach blocks

## Related

- ADRs: [ADR-0006](../../docs/architecture/ADR-0006-observability.md), [ADR-0017](../../docs/architecture/ADR-0017-status-brand-admin.md) (status-page portion)
- Decisions: D-15 Sub 4, D-38, D-46, D-49
- Cross-Epic: depends on EPIC-003 (RBAC for dashboard access) + EPIC-004 (event bus for cost rollups, incidents); feeds EPIC-006 (LLM Gateway emits to Langfuse + cost events here)

## Activity log

- 2026-05-05 — created as part of MVP-1 surface lockdown ([D-56](../../docs/decisions/DECISIONS_LOG.md))
