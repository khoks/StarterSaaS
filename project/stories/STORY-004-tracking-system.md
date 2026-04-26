---
id: STORY-004
title: In-repo tracking system (project/ + templates + seeded items)
type: story
status: in-progress
priority: P0
estimate: M
parent: EPIC-001
phase: scaffolding
tags: [tracking, project-board, scaffolding]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As a developer (and as a future Claude Code session), I need the in-repo JIRA-style tracking system fully bootstrapped — conventions doc, EPIC/STORY/TASK templates, two seeded epics (bootstrap + grooming), twelve seeded stories (Phase A bootstrap + Phase B grooming + Phase C MVP-1 lockdown placeholder), and a live `BOARD.md` — so the `work-tracking` skill has a real surface to update on session 1.

## Acceptance criteria

- [x] `project/README.md` documents conventions (IDs, frontmatter, status values, lifecycle rules, find-things grep recipes)
- [x] `project/TEMPLATES/EPIC.md`, `STORY.md`, `TASK.md` exist and match the conventions
- [x] `project/epics/EPIC-001-bootstrap.md` written, `status: in-progress`
- [x] `project/epics/EPIC-002-grooming.md` written, `status: backlog`
- [x] `project/stories/STORY-001` through `STORY-007` written for Phase A bootstrap work
- [x] `project/stories/STORY-008` through `STORY-012` written as Phase B/C placeholders, `status: backlog`
- [x] `project/BOARD.md` written, seeded with current Phase A state
- [ ] BOARD reflects all status changes through end of Phase A (final update lands as part of STORY-007)

## Tasks under this Story

(None — file authorship done inline.)

## Dependencies

- Blocks: STORY-007 (validation cycle exercises BOARD updates)
- Blocked by: STORY-001 (folder skeleton)

## Notes

We follow LearnPro's conventions exactly except:
- Only two epics are seeded (EPIC-001 bootstrap, EPIC-002 grooming). All subsystem Epics emerge from Phase B grooming and get IDs EPIC-003+ at that time.
- No tasks are pre-created — they're added on demand when work is being executed (no-speculative-tasks).

## Activity log

- 2026-04-25 — created; status → in-progress (templates + epics + stories + BOARD written this session)
