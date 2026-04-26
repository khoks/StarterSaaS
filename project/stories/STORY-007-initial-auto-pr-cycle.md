---
id: STORY-007
title: End-to-end auto-PR validation cycle
type: story
status: in-progress
priority: P0
estimate: S
parent: EPIC-001
phase: scaffolding
tags: [auto-pr, validation, scaffolding]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As the project owner, I want the three-skill housekeeping chain validated end-to-end — make a meaningful Phase-A-closure doc edit, branch off main, commit, push, open a PR via `gh pr create`, enable auto-merge via `gh pr merge --auto --squash`. After this Story closes, the project's housekeeping discipline is proven on a real PR.

## Acceptance criteria

- [x] After STORY-001…STORY-006 are complete, induce a meaningful doc/tracking edit (Phase A closure: stories → done, EPIC-001 → done, BOARD updated)
- [x] Branch created (`auto/phase-a-closure-2026-04-25`) following the auto-pr skill's naming convention (manual-style fallback)
- [x] Doc + tracking changes staged (only `docs/`, `project/`, `.claude/`)
- [x] Commit composed with conventional message + Co-Authored-By footer per the skill
- [x] Push to origin succeeds
- [x] PR opened via `gh pr create` with the full body template
- [ ] Auto-merge enabled via `gh pr merge --auto --squash` — depends on branch protection being configured manually
- [ ] Auto-merge succeeds and the PR squash-merges into main — depends on branch protection
- [ ] `gh pr list --state merged` shows the auto-PR — depends on the merge completing

## Tasks under this Story

(None — validation is mostly observation; if anything fails, fix-forward inline.)

## Dependencies

- Blocks: (none — this Story closes Phase A)
- Blocked by: STORY-001 through STORY-006

## Notes

The "validation cycle" doc edit IS the Phase A closure (stories marked done, EPIC-001 closed, BOARD refreshed). The act of running the auto-pr workflow on those changes IS the validation.

If `gh pr merge --auto --squash` fails because branch protection / auto-merge isn't configured on the GitHub repo yet, that's a graceful failure documented in the auto-pr skill's failure-mode table — the PR stays open, the user configures branch protection in the GitHub UI, and the merge proceeds. STORY-007 closes only after the merge actually lands.

The branch name `auto/phase-a-closure-2026-04-25` is a slight deviation from the skill's session-id-based naming because this is a manual end-of-Phase-A run, not a Stop-hook-triggered run. The deviation is intentional and one-time; future auto-pr runs follow the skill's standard pattern.

## Activity log

- 2026-04-25 — created
- 2026-04-25 — Phase A closure changes prepared; status → in-progress; auto-pr workflow being executed manually
