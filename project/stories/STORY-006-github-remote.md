---
id: STORY-006
title: GitHub remote — gh repo create khoks/StarterSaaS --private
type: story
status: done
priority: P0
estimate: S
parent: EPIC-001
phase: scaffolding
tags: [github, remote, scaffolding]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As the project owner, I want the StarterSaaS repo pushed to a private GitHub repository under `khoks/StarterSaaS` so that the auto-pr skill has a real `origin` to push to, and so the repo can be made public when MVP-1 ships without changing tooling.

## Acceptance criteria

- [x] `gh auth status` confirms the user is authenticated as `khoks`
- [x] `git init -b main` has been run locally
- [x] First bootstrap commit lands on `main` directly (no PR — there's no remote yet at commit time)
- [x] `gh repo create khoks/StarterSaaS --private --source=. --remote=origin --push` succeeds
- [x] `gh repo view khoks/StarterSaaS` opens the new private repo at `https://github.com/khoks/StarterSaaS`
- [x] CLAUDE.md documents the manual one-time branch-protection setup (require PRs, allow auto-merge, require status checks)
- [ ] User has been told to enable branch protection in the GitHub UI before the first auto-PR cycle (STORY-007) — **pending user action**

## Tasks under this Story

(None — handful of git/gh commands executed inline.)

## Dependencies

- Blocks: STORY-007
- Blocked by: STORY-001, STORY-002, STORY-003, STORY-004, STORY-005 (everything needs to be on disk first so the bootstrap commit is meaningful)

## Notes

Per D-10, the bootstrap commit (`82ff650`) is the only commit that lands directly on `main`. After that, `auto-pr` takes over and every subsequent change goes through a branch + PR + auto-merge cycle.

Branch protection is a manual one-time GitHub-UI configuration. Without it, `gh pr merge --auto` will hard-fail (gracefully, per the auto-pr skill's failure-mode table) — the PR still opens, the user enables auto-merge in repo settings, and the merge proceeds.

## Activity log

- 2026-04-25 — created
- 2026-04-25 — `gh auth status` ✓ (logged in as `khoks`); `git init` + bootstrap commit `82ff650` on main; `gh repo create khoks/StarterSaaS --private` succeeded; status → done
