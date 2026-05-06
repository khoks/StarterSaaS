---
id: STORY-012
title: MVP-1 scope lockdown — pick ~6 subsystems
type: story
status: in-progress
priority: P0
estimate: L
parent: EPIC-002
phase: scaffolding
tags: [grooming, mvp, phase-c]
created: 2026-04-25
updated: 2026-05-05
---

## Description

As the project owner, I need the MVP-1 surface locked: exactly which ~6 subsystems out of the 30+ in the vision land in the first thin vertical slice. Output: `docs/roadmap/MVP.md` v1 with the chosen subsystems, exit criteria, and one Epic created per subsystem (EPIC-003+).

## Acceptance criteria

- [ ] MVP-1 surface chosen from the **18+ candidates** that emerged through STORY-008/010/009 grooming. Original plan recommendation (auth + RBAC + multi-tenant DB + API gateway + notifications + observability) is now **insufficient** — the AI-first vision (D-15) and downstream decisions added: LLM Gateway (D-47), AI-streaming UI primitives (D-29), AI-assisted upstream merge (D-17), AI-assisted config generation (D-22), AI-validated plugin compat (D-23), Customer Profile Builder foundation (D-50), Context Query Service foundation (D-51), Agent Platform MVP-1 subset (D-52), AI Coworker MVP-1 lite (D-53), brand package (D-49), status page (D-19), deploy CLI + portal (D-42 + D-43), schema-per-tenant migration runner (D-44), event bus (D-45), observability + Langfuse (D-46), Auth.js (D-48). Final ~6-8 picks are this Story's job.
- [ ] `docs/roadmap/MVP.md` written with subsystem list, exit criteria, and dependency map
- [ ] One Epic created per chosen subsystem (e.g., EPIC-003 auth, EPIC-004 RBAC, EPIC-005 tenancy, EPIC-006 gateway, EPIC-007 notifications, EPIC-008 observability, plus AI subsystem Epics)
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
- 2026-05-05 — picked up; STORY-009 closed with 12 ADRs accepted (ADR-0004..ADR-0018) and 12 decisions logged (D-44..D-55). MVP-1 candidate set now spans 18+ items across foundational subsystems (auth/RBAC/tenancy/gateway/notifications/observability) + AI-first foundations (LLM Gateway/Customer Profile Builder/Context Query Service/Agent Platform MVP-1 subset/AI Coworker MVP-1 lite) + AI-first features (AI-assisted merge/config gen/plugin compat) + supporting infrastructure (deploy CLI/command portal/brand package/status page/event bus). This Story locks the final ~6-8 MVP-1 surface with `docs/roadmap/MVP.md` v1 + per-subsystem Epics (EPIC-003+) + per-Epic Stories drafted (≥3 each).
