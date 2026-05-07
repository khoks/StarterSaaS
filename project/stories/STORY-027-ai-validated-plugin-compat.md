---
id: STORY-027
title: AI-validated plugin compatibility check + sandbox sim
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-007
phase: mvp
tags: [mvp, ai-feature, plugin-compat, novel-idea]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Implement AI-validated plugin compatibility per [ADR-0013](../../docs/architecture/ADR-0013-plugin-spec-and-ai-compat.md). Zod-defined plugin extension-point schemas with semver-per-ext-point. Plugin manifest format declaring hooked ext-points + plugin version + required kit version range. `cli plugins check [--target-kit-version=X.Y.Z]` runs: load plugins → diff ext-points (current vs target) → LLM analysis with confidence scoring → sandbox sim (ephemeral DB schema + isolated event bus) for low-confidence cases → structured per-plugin per-ext-point report. Filed as medium-high novelty.

## Acceptance criteria

- [ ] `packages/plugin-spec` defines ext-point spec types + manifest validator (Zod)
- [ ] Ext-point semver tracking per ext-point (independent of hosting package version)
- [ ] Plugin manifest format with kit-version-range constraint
- [ ] `cli plugins check` resolves target kit version + loads adopter's plugin set
- [ ] Schema diff via Zod schema introspection
- [ ] LLM analysis (Opus 4.7 default) for non-trivial diffs; confidence scoring (high / medium / low)
- [ ] Sandbox sim: ephemeral DB schema (`sandbox_<run_id>`) + isolated event bus partition; runs plugin's test suite if present
- [ ] Engineer override path with audit log entry
- [ ] Compat-check audit + sandbox cleanup via saga (default 7-day retention)
- [ ] LLM calls go through Gateway (per STORY-022)
- [ ] Integration test: plugin authored against ext-point v1.0 → check against v2.0 (breaking) → low confidence + sandbox sim → engineer report

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: nothing in MVP-1
- Blocked by: STORY-022 (LLM Gateway); STORY-024 (architecture registry for ext-point auto-discovery); STORY-016 (Fastify plugin extension points must exist first)

## Related

- ADRs: [ADR-0013](../../docs/architecture/ADR-0013-plugin-spec-and-ai-compat.md)
- Decisions: D-23, D-35

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
