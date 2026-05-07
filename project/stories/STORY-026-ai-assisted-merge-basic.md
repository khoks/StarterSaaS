---
id: STORY-026
title: AI-assisted upstream merge — basic version (detect + propose + test)
type: story
status: backlog
priority: P0
estimate: XL
parent: EPIC-007
phase: mvp
tags: [mvp, ai-feature, upstream-merge, novel-idea]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Implement basic version of AI-assisted upstream merge per [ADR-0014](../../docs/architecture/ADR-0014-ai-assisted-merge.md). Detects upstream package updates → extracts user customization signatures from architecture registry → generates merge plan via LLM (Opus 4.7 default per [D-35](../../docs/decisions/DECISIONS_LOG.md)) → runs adopter's test suite against proposed merge in isolated branch → confidence scoring (high ≥0.9 / medium 0.6-0.9 / low <0.6) → engineer review default. Autonomous-mode toggle is v1 (engineer-review-required for MVP-1). Auto-fix mode is v1+. Filed as medium-high novelty.

## Acceptance criteria

- [ ] `npx @starter-saas/cli upgrade` detects new versions of subscribed kit packages
- [ ] Architecture registry extraction: which adapter contracts implemented + ext-points hooked + type imports per kit package the user uses
- [ ] LLM diff analysis (Opus 4.7) produces structured merge plan
- [ ] Test-first verification: apply merge plan in isolated branch (`auto/upgrade-<run_id>`) + run user's test suite
- [ ] Confidence scoring per change + aggregated plan-level score
- [ ] Engineer review default: PR opened with merge plan + per-change confidence + recommended fixes; labeled `needs-engineer` for low-confidence
- [ ] Per-version-pair LLM analysis cache in `platform.upgrade_analysis_cache`
- [ ] Run history in `platform.upgrade_history`
- [ ] LLM calls go through Gateway (per STORY-022) with prompt caching
- [ ] Integration test: simulate upstream update → upgrade run → merge plan generated → user tests pass on plan → PR opened with confidence report

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: nothing in MVP-1 (autonomous mode is v1)
- Blocked by: STORY-022 (LLM Gateway); STORY-024 (architecture registry for signature extraction)

## Related

- ADRs: [ADR-0014](../../docs/architecture/ADR-0014-ai-assisted-merge.md), [ADR-0012](../../docs/architecture/ADR-0012-ai-coworker-internal-ops.md)
- Decisions: D-17, D-35

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
