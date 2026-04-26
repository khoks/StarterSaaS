---
id: STORY-012
title: MVP-1 scope lockdown — pick ~6 subsystems
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-002
phase: scaffolding
tags: [grooming, mvp, phase-c]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As the project owner, I need the MVP-1 surface locked: exactly which ~6 subsystems out of the 30+ in the vision land in the first thin vertical slice. Output: `docs/roadmap/MVP.md` v1 with the chosen subsystems, exit criteria, and one Epic created per subsystem (EPIC-003+).

## Acceptance criteria

- [ ] ~6 MVP-1 subsystems chosen (plan recommendation: auth + RBAC + multi-tenant DB + API gateway + notifications + observability)
- [ ] `docs/roadmap/MVP.md` written with subsystem list, exit criteria, and dependency map
- [ ] One Epic created per chosen subsystem (e.g., EPIC-003 auth, EPIC-004 RBAC, EPIC-005 tenancy, EPIC-006 gateway, EPIC-007 notifications, EPIC-008 observability)
- [ ] Each subsystem Epic has at least 3 Stories drafted (more decomposed in Phase D as work begins)
- [ ] Out-of-MVP-1 subsystems explicitly listed in `docs/roadmap/MVP.md` § Out of scope

## Tasks under this Story

(Tasks created on demand during grooming.)

## Dependencies

- Blocks: all of Phase D (the build phase)
- Blocked by: STORY-008, STORY-009, STORY-010, STORY-011

## Notes

This is technically Phase C (lockdown), filed under EPIC-002 grooming because it's the natural finale of the grooming arc. After this Story closes, EPIC-002 closes, Phase B is done, and Phase D Epics (EPIC-003+) begin.

The "thin vertical slice" framing matters: MVP-1 must demonstrate every layer is reachable end-to-end (login → tenant context → API call → event published → notification fires → metric scraped), not just that each subsystem exists in isolation.

## Activity log

- 2026-04-25 — created (Phase B/C placeholder)
