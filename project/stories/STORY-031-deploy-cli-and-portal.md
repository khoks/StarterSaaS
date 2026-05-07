---
id: STORY-031
title: @starter-saas/cli + 10-step deploy flow + command portal (web/TUI with AI narration)
type: story
status: backlog
priority: P0
estimate: XL
parent: EPIC-008
phase: mvp
tags: [mvp, cli, deploy, portal, novel-idea]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Ship `@starter-saas/cli` per [D-42](../../docs/decisions/DECISIONS_LOG.md) and [D-43](../../docs/decisions/DECISIONS_LOG.md) ([ADR-0018](../../docs/architecture/ADR-0018-deploy-portal-mechanism.md)). Subcommands: `init` / `deploy` / `tenant` / `teardown` / `doctor`. 10-step idempotent deploy flow (validate → cloud auth → state bootstrap → AI-assist offer → network → data → schema-init → app services → smoke tests → success). Pulumi automation API drives provisioning programmatically. Interactive secrets default + `--env-file` + `--from-secrets-manager` modes. **Local web/TUI command portal** (default port 7732) shows real-time per-step status + pause/resume/abort + streamed logs + AI-generated narration via LLM Gateway. `--no-portal` minimal mode for CI; `--no-narration` for cost-conscious. Triple-confirm teardown. Telemetry opt-in default-OFF. Filed as medium novelty.

## Acceptance criteria

- [ ] `@starter-saas/cli` package shipped with all 5 subcommands
- [ ] 10-step deploy flow implemented end-to-end
- [ ] Pulumi automation API integration (programmatic; no shell-out)
- [ ] Pulumi-native idempotency: re-runnable deploy resumes from last state
- [ ] Interactive secrets prompts (default); `--env-file` and `--from-secrets-manager` modes
- [ ] AI-assisted setup integration: `--ai-assist` calls STORY-025
- [ ] Triple-confirm teardown with explicit data-loss warning
- [ ] Default 30-min deploy timeout (safety net)
- [ ] Anonymous telemetry opt-in default-OFF; `--telemetry` flag enables
- [ ] Local command portal: web server (default port 7732 with conflict scan to 7799) + browser auto-open
- [ ] TUI fallback for headless / `--no-open`
- [ ] Real-time per-step status across 10-step flow
- [ ] Pause / resume / abort controls (resource-boundary pause via Pulumi)
- [ ] AI-generated narration per step via LLM Gateway with prompt caching
- [ ] `--no-portal` minimal mode for CI; `--no-narration` for cost-conscious
- [ ] `cli doctor` surfaces drift / health / recommended actions
- [ ] `cli tenant` subtree (provision / migrate / delete / restore) wraps STORY-014/015 logic
- [ ] Both AWS + GCP deploy paths work (per [D-39](../../docs/decisions/DECISIONS_LOG.md))
- [ ] Integration test: `cli init --ai-assist` → `cli deploy` → portal opens → 10 steps stream with narration → success in <30 min on AWS AND GCP

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: STORY-021 (status page deployment); STORY-030 (marketing site deployment)
- Blocked by: STORY-022 (LLM Gateway for narration); STORY-023 (ai-ui shell for portal); STORY-025 (AI config gen for `--ai-assist`); STORY-014 / STORY-015 (tenant subcommands wrap these)

## Related

- ADRs: [ADR-0018](../../docs/architecture/ADR-0018-deploy-portal-mechanism.md), [ADR-0003](../../docs/architecture/ADR-0003-cloud-target.md)
- Decisions: D-13, D-15, D-39, D-40, D-41, D-42, D-43

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
