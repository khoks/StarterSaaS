---
id: EPIC-002
title: Phase B grooming — vision, requirements, architecture, tech stack
type: epic
status: backlog
priority: P0
phase: scaffolding
tags: [grooming, phase-b]
created: 2026-04-25
updated: 2026-04-25
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
