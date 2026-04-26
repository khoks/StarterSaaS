---
id: STORY-007
title: End-to-end auto-PR validation cycle
type: story
status: todo
priority: P0
estimate: S
parent: EPIC-001
phase: scaffolding
tags: [auto-pr, validation, scaffolding]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As the project owner, I want the three-skill housekeeping chain validated end-to-end — induce a tiny doc edit, let the Stop hook fire, watch `harvest-knowledge` (probably a no-op), `work-tracking` (mark Phase A stories done, close EPIC-001), and `auto-pr` (branch + commit + push + PR + auto-merge) all run cleanly. After this Story closes, the project's housekeeping discipline is proven.

## Acceptance criteria

- [ ] After STORY-001…STORY-006 are complete, induce a small doc edit (e.g., add a line to `DECISIONS_LOG.md` or a note to `BOARD.md`)
- [ ] At session end, the Stop hook fires
- [ ] `harvest-knowledge` runs and reports either an update or "nothing new to persist"
- [ ] `work-tracking` runs and updates Phase A stories to `done`, closes EPIC-001, updates `BOARD.md`
- [ ] `auto-pr` creates a branch (e.g., `auto/<sid>-2026-04-25`), commits doc + tracking changes, pushes, opens a PR via `gh pr create`, enables auto-merge via `gh pr merge --auto --squash`
- [ ] Auto-merge succeeds (branch protection allows it; CI passes — markdown-lint only)
- [ ] `gh pr list --state merged` shows the auto-PR
- [ ] `git log --oneline` on `main` shows the squashed merge commit
- [ ] `BOARD.md` on `main` shows EPIC-001 closed and STORY-007 done

## Tasks under this Story

(None — validation is mostly observation; if anything fails, fix-forward inline.)

## Dependencies

- Blocks: (none — this Story closes Phase A)
- Blocked by: STORY-001 through STORY-006

## Notes

If the first auto-PR cycle fails (e.g., branch protection misconfigured, `gh` auth expired), do NOT loop or retry — surface the error verbatim, fix the underlying issue (likely a one-time setup), and re-run. The skill is designed to abort cleanly rather than hide failures.

The exact "induce a small doc edit" can be: append a `2026-04-25 — Phase A bootstrap landed` line to `DECISIONS_LOG.md`, OR note the validation cycle itself in `BOARD.md`.

## Activity log

- 2026-04-25 — created
