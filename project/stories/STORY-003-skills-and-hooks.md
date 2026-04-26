---
id: STORY-003
title: Three Claude Code skills + Stop hook
type: story
status: in-progress
priority: P0
estimate: M
parent: EPIC-001
phase: scaffolding
tags: [skills, hooks, scaffolding]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As the user running future Claude Code sessions, I need the Stop hook to fire `harvest-knowledge` → `work-tracking` → `auto-pr` automatically at session end, so that prose docs, project tracking, and git history all stay in sync without manual prompting.

## Acceptance criteria

- [x] `.claude/settings.json` registers the Stop hook pointing to `bash .claude/hooks/post-session-housekeeping.sh`
- [x] `.claude/hooks/post-session-housekeeping.sh` is the marker-file-based blocker adapted from LearnPro, but reminds Claude about the **three** skills
- [x] `.claude/skills/harvest-knowledge/SKILL.md` exists, adapted for SaaS-platform vocabulary
- [x] `.claude/skills/work-tracking/SKILL.md` exists, adapted for the StarterSaaS epic taxonomy (only EPIC-001 / EPIC-002 seeded)
- [x] `.claude/skills/auto-pr/SKILL.md` exists with: pre-flight checks, branch-naming rules, staging scope (`docs/`, `project/`, `.claude/` only), commit-message templates, PR body template, auto-merge step, fallback-to-local commit when no remote, explicit failure-mode handling
- [ ] STORY-007 validates the chain end-to-end (one auto-PR cycle from a small doc edit)

## Tasks under this Story

(None — three skill files written inline.)

## Dependencies

- Blocks: STORY-007
- Blocked by: STORY-001

## Notes

`auto-pr` is the only skill that touches `git`. `harvest-knowledge` writes prose only. `work-tracking` writes structured items only. The Stop hook chains them in fixed order: harvest → tracking → pr.

The hook script uses sed-based JSON extraction (no `jq` dependency) so it works on a vanilla Windows/WSL2 + Git Bash setup without additional tooling.

## Activity log

- 2026-04-25 — created; status → in-progress (all three skill files + hook + settings written)
