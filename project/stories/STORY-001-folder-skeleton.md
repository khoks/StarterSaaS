---
id: STORY-001
title: Folder skeleton + bootstrap directory tree
type: story
status: done
priority: P0
estimate: S
parent: EPIC-001
phase: scaffolding
tags: [bootstrap, scaffolding]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As a developer bootstrapping StarterSaaS, I need the full directory skeleton (`docs/`, `project/`, `.claude/`, `.github/`) created so subsequent Stories can drop files into the right places without ad-hoc `mkdir` calls.

## Acceptance criteria

- [x] `docs/{vision,architecture,decisions,product,roadmap}/` exist
- [x] `project/{epics,stories,tasks,TEMPLATES}/` exist
- [x] `.claude/{hooks,skills}/` exist with `.claude/skills/{harvest-knowledge,work-tracking,auto-pr}/` subfolders
- [x] `.github/workflows/` exists
- [x] `git init -b main` has been run (root-commit `82ff650`)

## Tasks under this Story

(None — single-shot folder creation, executed inline.)

## Dependencies

- Blocks: STORY-002, STORY-003, STORY-004, STORY-005
- Blocked by: (none)

## Notes

The skeleton was created as the very first action of the bootstrap session, before any file authorship. `scripts/{windows,mac,linux}/` are NOT created in this Story — they land in Phase D when bootstrap scripts actually exist.

## Activity log

- 2026-04-25 — created; status → in-progress (folders created during bootstrap)
- 2026-04-25 — folders verified; awaiting `git init` to mark done
- 2026-04-25 — git init complete (commit `82ff650`); status → done
