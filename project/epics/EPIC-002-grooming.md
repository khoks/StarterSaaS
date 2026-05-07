---
id: EPIC-002
title: Phase B grooming — vision, requirements, architecture, tech stack
type: epic
status: done
priority: P0
phase: scaffolding
tags: [grooming, phase-b]
created: 2026-04-25
updated: 2026-05-06
---

## Goal

Run heavy interactive PM + engineer Q&A sessions to lock the foundational decisions for StarterSaaS: target persona, headline differentiator, MVP-1 subsystem surface (~6 of the 30+ listed), tech stack, cloud target, multi-tenancy model, white-label mechanism, plugin architecture, and observability defaults. Output: `GROOMED_FEATURES.md` with MVP/v1/v2/v3 tagging, full `ARCHITECTURE.md`, ADR-0002+ for every locked architectural decision, populated `NOVEL_IDEAS.md` for any patentable approaches surfaced, and a fully-decomposed Story+Task list under new subsystem Epics.

## Scope

- Vision lockdown (persona, differentiator, fork-vs-subscribe model)
- Requirements lockdown (MVP-1 subsystem surface, white-label mechanism, marketing-site placement)
- Architecture lockdown (backend stack, frontend stack, multi-tenancy isolation, event bus, ADR drafts)
- Tech-stack lockdown (TS/Go/polyglot; framework choices)
- Cloud-target lockdown (AWS / GCP / both)
- Algorithm / novel-idea probes (upsell ML, care chatbot, saga choreography, data-quality, nudge engine)
- Documentation: `GROOMED_FEATURES.md`, `RECOMMENDED_ADDITIONS.md`, `NOVEL_IDEAS.md`, `ARCHITECTURE.md`, `MVP.md`, `ROADMAP.md`
- ADR-0002 (stack), ADR-0003 (cloud), ADR-0004 (multi-tenancy), ADR-0005 (event bus), ADR-0006 (observability), and any others surfaced
- Spin out subsystem Epics (EPIC-003+) once MVP-1 surface is locked (this is the Phase C boundary)

## Out of scope

- Any code authoring (Phase D)
- Final Story/Task decomposition for subsystems beyond MVP-1 (those land as backlog stubs only)
- Pricing / monetization model
- Branding / marketing copy

## Stories under this Epic

- STORY-008 — Vision grooming (persona, differentiator, kit promise) (backlog)
- STORY-009 — Architecture grooming (multi-tenancy, event bus, observability) (backlog)
- STORY-010 — Tech-stack decision (backend / frontend / polyglot) (backlog)
- STORY-011 — Cloud-target decision (AWS / GCP / both) (backlog)
- STORY-012 — MVP-1 scope lockdown (~6 subsystems chosen) (backlog)

## Exit criteria

- [ ] `docs/vision/GROOMED_FEATURES.md` complete with MVP/v1/v2/v3 tagging
- [ ] `docs/architecture/ARCHITECTURE.md` complete (replaces stub)
- [ ] `docs/roadmap/MVP.md` complete with the ~6 chosen subsystems and exit criteria
- [ ] ADR-0002 through ADR-0006 (stack, cloud, multi-tenancy, event bus, observability) accepted
- [ ] At least one subsystem Epic created per chosen MVP-1 subsystem (EPIC-003…EPIC-008 or similar)
- [ ] All Phase B stories `status: done`

## Related

- Plan: this session's plan file (Phase B preview section)
- Will produce: ADR-0002 through ADR-0006

## Activity log

- 2026-04-25 — created (Phase B placeholder, executes after EPIC-001 closes)
- 2026-04-27 — picked up; full Phase B sweep started with STORY-008
- 2026-04-28 — STORY-008 closed (12 decisions D-12..D-23, 7 NOVEL_IDEAS, 4 RECOMMENDED_ADDITIONS, CLAUDE.md vision updated). Picked up STORY-010 (tech-stack decision). Per dependency order: STORY-010 → STORY-011 → STORY-009 → STORY-012 to close EPIC-002.
- 2026-05-02 — STORY-010 closed (15 decisions D-24..D-38 plus D-21 cross-cutting; ADR-0002 written). Picked up STORY-011 (cloud-target). 2 of 5 stories done.
- 2026-05-02 — STORY-011 closed (5 decisions D-39..D-43; ADR-0003 written; 1 NOVEL_IDEAS entry — Local command portal). Picked up STORY-009 (architecture grooming) with expanded ACs absorbing ~14 queued ADRs (ADR-0004..0017). 3 of 5 stories done. STORY-009 estimate bumped L → XL; likely to split into 9A / 9B / 9C as work progresses.
- 2026-05-05 — STORY-009 closed (12 decisions D-44..D-55; 12 ADRs accepted ADR-0004 through ADR-0018; 0 splits ultimately needed — all done in 6 Qs via tight bundling). Picked up STORY-012 (MVP-1 scope lockdown). 4 of 5 stories done. STORY-012 closes Phase B.
- 2026-05-06 — STORY-012 closed (D-56 MVP-1 surface lockdown + `docs/roadmap/MVP.md` v1 + 6 Epic stubs EPIC-003..EPIC-008 + 19 Stories STORY-013..STORY-031). **EPIC-002 closes. Phase B done.** Total Phase B output: 45 decisions D-12..D-56; 18 ADRs accepted ADR-0001..ADR-0018; 5 stories closed STORY-008/010/011/009/012; 6 MVP-1 subsystem Epics created; 19 Phase D Stories drafted. Phase D Epics (EPIC-003..EPIC-008) ready to begin.
- 2026-04-27 — workflow lock recorded as D-12 in `docs/decisions/DECISIONS_LOG.md` (full sweep + full PM treatment per question); STORY-008 paused mid-Q1 awaiting user's persona decision
