---
id: STORY-012
title: MVP-1 scope lockdown — pick ~6 subsystems
type: story
status: done
priority: P0
estimate: L
parent: EPIC-002
phase: scaffolding
tags: [grooming, mvp, phase-c]
created: 2026-04-25
updated: 2026-05-06
---

## Description

As the project owner, I need the MVP-1 surface locked: exactly which ~6 subsystems out of the 30+ in the vision land in the first thin vertical slice. Output: `docs/roadmap/MVP.md` v1 with the chosen subsystems, exit criteria, and one Epic created per subsystem (EPIC-003+).

## Acceptance criteria

- [x] MVP-1 surface chosen from the **18+ candidates** that emerged through STORY-008/010/009 grooming — *locked 2026-05-05 as D-56: 19 capabilities organized as 6 thematic Epics*
- [x] `docs/roadmap/MVP.md` written with subsystem list, exit criteria, and dependency map — *written 2026-05-05; lives at [`docs/roadmap/MVP.md`](../../docs/roadmap/MVP.md)*
- [x] One Epic created per chosen subsystem (e.g., EPIC-003 auth, EPIC-004 RBAC, EPIC-005 tenancy, EPIC-006 gateway, EPIC-007 notifications, EPIC-008 observability, plus AI subsystem Epics) — *thematic-cluster Epics (6) created 2026-05-05: EPIC-003 Identity + Tenancy, EPIC-004 Communication Plumbing, EPIC-005 Observability + AI Cost, EPIC-006 AI Foundation, EPIC-007 AI-First Features, EPIC-008 UX + Deploy*
- [x] Each subsystem Epic has at least 3 Stories drafted (more decomposed in Phase D as work begins) — *2026-05-06: 19 Stories drafted (STORY-013 through STORY-031), distributed 3+3+3+3+4+3 across EPIC-003..EPIC-008; each Story has frontmatter + description + 5-15 ACs + dependency graph + cross-references; Phase D expands each*
- [x] Out-of-MVP-1 subsystems explicitly listed in `docs/roadmap/MVP.md` § Out of scope — *~30 deferrals listed with phase fits (v1 / v1+ / v2)*

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
- 2026-05-05 — **Q1 locked** end-to-end per assistant recommendation. **D-56: MVP-1 surface = 19 capabilities organized as 6 thematic Epics** (Identity + Tenancy / Communication Plumbing / Observability + AI Cost / AI Foundation / AI-First Features / UX + Deploy). Foundation-only for AI Sub 1 (Customer Profile Builder) + Sub 2 (Context-Resolving Query Service) — full subsystems v1. Out-of-MVP-1 explicit list (~30 capabilities) covers v1 / v1+ / v2 deferrals. **`docs/roadmap/MVP.md` v1 written** (mission + persona + 19-capability surface organized by Epic + exit criteria + dependency map + out-of-scope table + cross-references). **6 Epic stub files created**: EPIC-003 (Identity + Tenancy), EPIC-004 (Communication Plumbing), EPIC-005 (Observability + AI Cost), EPIC-006 (AI Foundation), EPIC-007 (AI-First Features), EPIC-008 (UX + Deploy). Each Epic has goal + scope + out-of-scope + exit criteria + cross-Epic dependencies. ACs ticked: 4 of 5 (only "≥3 Stories per Epic" remains). Next: **Q2 — draft ≥3 Stories per Epic + close STORY-012 + close EPIC-002 + Phase B done**.
- 2026-05-06 — **Q2 done. STORY-012 closed.** 19 Stories drafted across 6 Epics: STORY-013/014/015 under EPIC-003 (Identity + Tenancy); STORY-016/017/018 under EPIC-004 (Communication Plumbing); STORY-019/020/021 under EPIC-005 (Observability + AI Cost); STORY-022/023/024 under EPIC-006 (AI Foundation); STORY-025/026/027/028 under EPIC-007 (AI-First Features); STORY-029/030/031 under EPIC-008 (UX + Deploy). Each Story has frontmatter (id, title, status: backlog, priority: P0, estimate, parent Epic, phase: mvp, tags) + 1-paragraph description + 5-15 ACs + Tasks (Phase D placeholder) + Dependencies (blocks/blocked-by) + Related (ADRs + decisions) + activity log entry. Each Epic file updated to reference its Stories with title + estimate. **All 5 STORY-012 ACs ticked. EPIC-002 closes with this Story.**
