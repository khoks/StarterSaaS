---
id: STORY-025
title: AI-assisted config generation pipeline (NL → starter.config.ts)
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-007
phase: mvp
tags: [mvp, ai-feature, config-gen, novel-idea]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Implement AI-assisted config generation per [ADR-0015](../../docs/architecture/ADR-0015-ai-assisted-config-gen.md). Engineer types NL description → LLM (Opus 4.7 default per [D-35](../../docs/decisions/DECISIONS_LOG.md)) generates candidate `starter.config.ts` against current kit's Zod schema → repair-and-retry max 3 on validation failure → adapter verification against architecture registry (no hallucinated adapters) → engineer-confirmation UX with diff + inline explanations → iteration loop max 5. Triggered via `cli init --ai-assist` and from the deploy command portal step 4. Filed as medium-high novelty in NOVEL_IDEAS.

## Acceptance criteria

- [ ] `packages/config-gen` ships the pipeline (LLM prompt templates + Zod validator + diff renderer)
- [ ] System prompt includes: current kit version's full Zod schema for `starter.config.ts`, architecture registry adapter catalog, persona context
- [ ] Repair-and-retry loop max 3 attempts on Zod validation failure
- [ ] Adapter verification: every recommended adapter MUST exist in registry; otherwise reject + retry
- [ ] Schema-version awareness: only generate against current kit version's schema
- [ ] Engineer-confirmation UX: show diff (current vs. generated), inline explanation per change, apply on confirm
- [ ] Iteration loop max 5 rounds
- [ ] Generation history in `platform.config_gen_history` (90-day retention)
- [ ] LLM calls go through Gateway (per STORY-022)
- [ ] Integration test: NL prompt → valid generated config in <30 seconds → engineer confirms → file written → deploy succeeds

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: STORY-031 (deploy CLI `--ai-assist` flag uses this)
- Blocked by: STORY-022 (LLM Gateway); STORY-024 (architecture registry for adapter catalog)

## Related

- ADRs: [ADR-0015](../../docs/architecture/ADR-0015-ai-assisted-config-gen.md), [ADR-0011](../../docs/architecture/ADR-0011-llm-gateway.md)
- Decisions: D-22, D-35

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
