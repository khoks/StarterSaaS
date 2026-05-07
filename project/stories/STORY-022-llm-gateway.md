---
id: STORY-022
title: LLM Gateway core + Anthropic / OpenAI / Ollama provider adapters + Safety filters
type: story
status: backlog
priority: P0
estimate: XL
parent: EPIC-006
phase: mvp
tags: [mvp, llm-gateway, ai-foundation, safety, model-hub, eval]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Implement the LLM Gateway (AI Subsystem 4) per [ADR-0011](../../docs/architecture/ADR-0011-llm-gateway.md). Gateway is a **policy enforcement point + observability choke point — NOT a routing brain**. Per-component LLM provider/model selection (each feature declares its preferred provider + model in its own config). Gateway intercepts every call to apply cross-cutting policy. 4 components: (1) Gateway core (interception + OTel GenAI span + Langfuse trace + cost-event publish to bus), (2) Safety layer (PII/PCI/profanity/illegal/injection/bias filters; configurable per-tenant), (3) Model Hub (Anthropic + OpenAI + Ollama MVP-1 + adopter-hosted custom-model support), (4) Eval/Cost (eval framework hooks + per-call cost + per-tenant budget enforcement integration).

## Acceptance criteria

- [ ] `packages/llm-gateway` defines the Gateway contract (Zod-typed)
- [ ] Provider adapters ship for Anthropic, OpenAI, Ollama
- [ ] Adopter-hosted custom-model adapter slot (registry pattern)
- [ ] Safety filters: pre-call (PII/PCI scrub on prompts + injection detection + profanity / illegal-advice / toxicity / bias filtering) + post-call (same on responses + output schema validation when caller declares one)
- [ ] Per-tenant safety config via `starter.config.ts → llm.safety: { ... }`
- [ ] Budget enforcer middleware integrates with STORY-020's `platform.tenant_budgets`
- [ ] Cost event published to `platform.llm_call` topic on every call
- [ ] OTel GenAI span emitted on every call with full attributes
- [ ] Langfuse trace integration alongside OTel
- [ ] Anthropic prompt caching transparently leveraged
- [ ] Eval framework hooks: optional eval suite per call → results in `platform.eval_results`
- [ ] Per-feature LLM declaration: feature config declares `{provider, model, fallback?, eval_suite?}`
- [ ] Integration test: LLM call → Safety scrub → provider call → response → output validation → cost event → eval suite (if configured) → all observable

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: every AI feature in EPIC-007 + EPIC-008's deploy portal narration
- Blocked by: STORY-019 (observability foundation); STORY-017 (event bus); STORY-020 (cost+budget tables)

## Related

- ADRs: [ADR-0011](../../docs/architecture/ADR-0011-llm-gateway.md), [ADR-0006](../../docs/architecture/ADR-0006-observability.md)
- Decisions: D-15 Sub 4, D-34, D-35, D-38, D-47

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
