---
id: EPIC-006
title: AI Foundation — LLM Gateway, ai-ui primitives, architecture registry
type: epic
status: backlog
priority: P0
phase: mvp
tags: [mvp, ai-foundation, llm-gateway, ai-ui, architecture-registry]
created: 2026-05-05
updated: 2026-05-05
---

## Goal

Ship the **AI-first foundation** that EPIC-007 (AI-First Features) builds on: LLM Gateway as policy + observability choke point + AI-streaming UI primitives + architecture registry foundation. Without this Epic, the AI-first claim is theoretical.

## Capabilities (per [docs/roadmap/MVP.md](../../docs/roadmap/MVP.md))

- **LLM Gateway (Sub 4)** ([D-47](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0011](../../docs/architecture/ADR-0011-llm-gateway.md)) — policy enforcement + observability choke point (NOT a routing brain); per-component LLM provider/model selection; 4 components: (1) Gateway core (interception + OTel GenAI + Langfuse + cost-event publish per D-45), (2) Safety (PII/PCI/profanity/illegal/injection/bias filters, configurable per-tenant), (3) Model Hub (Anthropic + OpenAI + Ollama MVP-1 + adopter-hosted custom-model support), (4) Eval/Cost (eval framework hooks + per-call cost + per-tenant budget enforcement)
- **AI-streaming UI primitives** (`packages/ai-ui`) ([D-29](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0016](../../docs/architecture/ADR-0016-ai-streaming-ui-integration.md)) — framework-agnostic React components: streaming-message + agent-step + token-counter + RAG-source-citation + prompt-input + tool-call-card; SSE primary streaming; component-orchestrator decoupled via Zod-typed StreamEvents + React context; WCAG 2.1 AA floor with axe-core in CI; brand integration via `@starter-saas/brand` tokens
- **Architecture registry foundation** (`platform.architecture_registry`) ([D-53](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0012](../../docs/architecture/ADR-0012-ai-coworker-internal-ops.md)) — auto-populated from kit's package.json graph + adopter packages + Drizzle schemas + Zod boundaries + ADR scan; tracks endpoints / API schemas / event schemas / responsibilities / current versions; queryable by AI agents; refreshed on `cli doctor --refresh-architecture`, post-deploy hook, schema migration

## Scope

- `@starter-saas/llm-gateway` package with Anthropic + OpenAI + Ollama provider adapters
- Safety filter middleware: pre-call (PII scrub on prompts, injection detection, profanity / illegal-advice / toxicity / bias) + post-call (same on responses + output schema validation); pluggable + adopter-config-driven
- Model Hub registry (in-memory loaded from `starter.config.ts`); custom-model registration API
- Anthropic prompt caching transparently applied where the active provider supports it
- Eval framework hooks: capture LLM call → optional eval suite (Promptfoo / DeepEval / custom) → store results in `platform.eval_results`
- Per-tenant budget enforcer middleware (uses `platform.tenant_budgets` from EPIC-005)
- `packages/ai-ui` React components (all 6 primitives from D-29) + Zod-typed StreamEvents
- SSE streaming protocol implementation + streaming-HTTP fallback + `useAgentSession` hook
- Reconnect-and-resume via `Last-Event-ID` header
- a11y: ARIA live regions + focus management + axe-core CI tests
- Brand token consumption (Tailwind variables from `@starter-saas/brand`)
- `platform.architecture_registry` table + auto-discovery hooks + refresh job (saga)
- Architecture registry queryable API (used by EPIC-007's AI-first features)

## Out of scope (deferred per MVP.md § Out of scope)

- AWS Bedrock / GCP Vertex / Azure OpenAI / Together / Replicate provider adapters (v1+)
- WebSocket bidirectional streaming (v1+)
- Provisioned-throughput-request workflow (v1+)
- Per-feature LLM cost optimization recommendations (v2+)
- ML platform adapters (SageMaker / Vertex AI / MLflow / W&B) — covered by D-54 v1+

## Stories under this Epic

(Drafted in [STORY-012](../stories/STORY-012-mvp1-scope-lockdown.md) Q2; ≥3 expected.)

## Exit criteria

- [ ] LLM Gateway accepts requests with `{provider, model, messages, options}` and routes to the named provider adapter
- [ ] All Safety filters run pre + post call; configurable per tenant
- [ ] Cost event emitted to event bus on every LLM call; cost dashboard reflects (per EPIC-005)
- [ ] Per-tenant budget enforcer blocks LLM calls when hard limit hit
- [ ] Anthropic prompt caching reduces costs measurably on repeated kit context
- [ ] `packages/ai-ui` ships all 6 primitives + render correctly with streaming
- [ ] Component-orchestrator decoupling: `useAgentSession` hook works with custom orchestrators (not just kit's Sub 3)
- [ ] WCAG 2.1 AA: axe-core tests pass in CI
- [ ] Architecture registry auto-populates on first `cli doctor --refresh-architecture`
- [ ] Registry refresh on schema migration / post-deploy hook works
- [ ] AI agent can query registry via Sub 2 (Context Query Service foundation)
- [ ] Integration test: LLM call → Safety scrub → provider call → response → output validation → cost event → eval suite → all observable

## Related

- ADRs: [ADR-0011](../../docs/architecture/ADR-0011-llm-gateway.md), [ADR-0016](../../docs/architecture/ADR-0016-ai-streaming-ui-integration.md), [ADR-0012](../../docs/architecture/ADR-0012-ai-coworker-internal-ops.md)
- Decisions: D-15 Sub 4, D-29, D-34, D-35, D-36, D-37, D-47, D-53
- Cross-Epic: depends on EPIC-003 (session for tenant attribution) + EPIC-004 (event bus for cost events) + EPIC-005 (observability + budget tables); feeds EPIC-007 (AI-first features)

## Activity log

- 2026-05-05 — created as part of MVP-1 surface lockdown ([D-56](../../docs/decisions/DECISIONS_LOG.md))
