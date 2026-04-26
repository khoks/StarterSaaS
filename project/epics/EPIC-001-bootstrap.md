---
id: EPIC-001
title: Phase A bootstrap — repo, skills, tracking, GitHub
type: epic
status: done
priority: P0
phase: scaffolding
tags: [bootstrap, scaffolding, phase-a]
created: 2026-04-25
updated: 2026-04-25
---

## Goal

Stand up the StarterSaaS repo with a clean Claude Code working surface: project conventions, the three-skill housekeeping chain (`harvest-knowledge` → `work-tracking` → `auto-pr`), JIRA-style in-repo tracking, the GitHub remote (private), MIT license, and one validated end-to-end auto-PR cycle. After this Epic closes, the repo can host the Phase B grooming session without further infrastructure work.

## Scope

- Folder skeleton (`docs/`, `project/`, `.claude/`, `.github/`, `scripts/` shells)
- `CLAUDE.md` as the session entry point
- Three Claude Code skills under `.claude/skills/` with the Stop hook to remind about them
- `project/` tracking system (README + templates + seeded epics/stories + BOARD)
- `LICENSE` (MIT) and root `README.md`
- `.gitignore`, `.gitattributes`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/ci.yml`
- Vision capture: verbatim user message in `docs/vision/RAW_VISION.md`
- Decisions log seeded with D-1…D-11 from the bootstrap session
- ADR-0001 locking the MIT license choice
- Stub docs for architecture, MVP, roadmap (filled in Phase B/C)
- `git init` + first bootstrap commit on `main` (commit `82ff650`)
- GitHub private repo creation via `gh` + first push (`https://github.com/khoks/StarterSaaS`)
- One end-to-end validation of the auto-pr skill (PR #1 squash-merged as commit `5f2ab0a`)

## Out of scope

- Any product code (apps, services, packages)
- Tech stack selection (deferred to Phase B grooming)
- Cloud target selection (AWS / GCP — Phase B/C)
- Multi-tenancy model (Phase B/C)
- Deployment scripts (Phase D)
- ADRs beyond ADR-0001 (later ADRs come out of Phase B grooming)
- Subsystem implementation (auth, RBAC, gateway, billing, etc.)
- Marketing site
- ML / data platform / observability stack

## Stories under this Epic

- STORY-001 — Folder skeleton + bootstrap directory tree (done)
- STORY-002 — CLAUDE.md + vision capture (done)
- STORY-003 — Three Claude Code skills + Stop hook (done)
- STORY-004 — In-repo tracking system (project/ + templates + seeded items) (done)
- STORY-005 — License, README, .gitignore, .gitattributes, .github files (done)
- STORY-006 — GitHub remote: `gh repo create khoks/StarterSaaS --private` (done)
- STORY-007 — End-to-end auto-PR validation cycle (done)

## Exit criteria

- [x] All 7 Phase A stories are `status: done`
- [x] `git log --oneline` shows the bootstrap commit (`82ff650`) + at least one auto-PR cycle commit (`5f2ab0a`)
- [x] `gh repo view khoks/StarterSaaS` opens the private GitHub repo
- [x] At least one PR has been opened by the `auto-pr` workflow and auto-merged (PR #1)
- [x] `BOARD.md` reflects EPIC-001 closed and EPIC-002 ready
- [x] Starting a new session in this folder triggers the Stop hook with the 3-skill reminder (verifiable on next session)

## Related

- Plan: this session's plan file (saved to `~/.claude/plans/i-want-to-build-happy-cocke.md`; safe to rename/delete now that Phase A has closed)
- ADR: [`docs/architecture/ADR-0001-license-mit.md`](../../docs/architecture/ADR-0001-license-mit.md)
- Decisions log: [`docs/decisions/DECISIONS_LOG.md`](../../docs/decisions/DECISIONS_LOG.md) (D-1…D-11)
- GitHub repo: https://github.com/khoks/StarterSaaS
- First auto-PR: https://github.com/khoks/StarterSaaS/pull/1

## Activity log

- 2026-04-25 — created; status → in-progress (Phase A execution underway)
- 2026-04-25 — STORY-001…STORY-006 closed `done`; STORY-007 in-progress with the closure PR; awaiting merge to reach Epic exit
- 2026-04-25 — PR #1 auto-merged; STORY-007 closed; all exit criteria met; status → done. Phase A complete.
