---
id: STORY-008
title: Vision grooming — persona, differentiator, kit promise
type: story
status: in-progress
priority: P0
estimate: L
parent: EPIC-002
phase: scaffolding
tags: [grooming, vision, phase-b]
created: 2026-04-25
updated: 2026-04-27
---

## Description

As a product manager (the user's PM hat), I need to lock the foundational vision questions for StarterSaaS before any architecture or code work starts: who is the primary persona, what's the headline differentiator vs. existing options (Supabase, Pocketbase, Appwrite, AWS Amplify, Firebase, Strapi, Medusa, Saleor), and is the kit's promise "fork once and modify" or "subscribe to upstream and stay updated."

## Acceptance criteria

- [x] Primary persona decided and documented in `docs/vision/GROOMED_FEATURES.md` § Persona — *locked 2026-04-27 as D-13*
- [x] Headline differentiator articulated in one sentence in `docs/vision/GROOMED_FEATURES.md` § Differentiator — *locked 2026-04-28 as D-15: AI-first, production-grade SaaS platform — 30+ integrated layers, white-labelable, one-command deployable*
- [x] Kit-promise model (fork-once vs. subscribe-to-upstream vs. hybrid) decided and documented — *locked 2026-04-28 as D-16 (hybrid + thin-shell + packages) and D-17 (AI-assisted upstream merge as MVP-1+ feature)*
- [x] Pre-auth marketing site placement decided (same repo / sibling repo) — feeds into STORY-012 — *locked 2026-04-28 as D-18 (sibling repo default + monorepo alternative + brand-as-package) and D-19 (status page = separate repo / managed service)*
- [ ] White-label mechanism direction picked (config-driven / code-gen / plugin-driven), even if final form is locked in STORY-009
- [ ] Any novel ideas surfaced during the discussion land in `docs/vision/NOVEL_IDEAS.md`

## Tasks under this Story

(Tasks created on demand during grooming.)

## Dependencies

- Blocks: STORY-009, STORY-010, STORY-011, STORY-012
- Blocked by: EPIC-001 closing

## Notes

Question list in the plan file. The assistant surfaces each question with its recommendation + tradeoffs; the user (wearing PM hat) decides; the assistant records and moves on. No code, no tech-stack picks here — pure product.

## Activity log

- 2026-04-25 — created (Phase B placeholder)
- 2026-04-27 — picked up; Phase B grooming session — full sweep planned (STORY-008 → STORY-012); first question: primary persona
- 2026-04-27 — Q1 (primary persona) posted with full PM treatment — competitive context (Supabase / Pocketbase / Appwrite / Firebase / Strapi / Medusa / Saleor / Bubble / Retool), 3 candidates analyzed (solo founder / small-team CTO / mid-stage platform team) + 4 alternatives surfaced (founder's first engineer / white-label agencies / vertical-SaaS in regulated industries / internal-platform team at non-tech companies); recommendation = small-team CTO primary
- 2026-04-27 — **Q1 locked**: user picked **founder's first engineer** as primary (overrode my recommendation with a sharper framing). Stack: primary = founder's first engineer / secondary = solo founder (v1 lite profile) / tertiary = small-team CTO (lifecycle continuity). Logged as D-13. AC #1 ticked. Persona section in `GROOMED_FEATURES.md` populated. Migration-path implication filed to `RECOMMENDED_ADDITIONS.md`. Next: Q2 — headline differentiator
- 2026-04-27 — **D-14 logged**: assistant authorized to use `gh pr merge --admin --squash` for doc-only / tracking-only PRs (housekeeping / grooming / decisions / ADRs). Branch protection on main stays strict; this is a per-PR escape hatch scoped to docs / project / .claude. Source-code PRs (Phase D onward) DO NOT get this override
- 2026-04-28 — **Q2 locked**: differentiator (and core vision) = **"AI-first, production-grade SaaS platform — 30+ integrated layers you will eventually need, white-labelable, one-command deployable."** User combined breadth + production-grade + one-command deploy framings, added the **AI-first** dimension I had not surfaced. Logged as D-15. AC #2 ticked. Differentiator section in `GROOMED_FEATURES.md` populated. CLAUDE.md mission paragraph updated to lead with AI-first
- 2026-04-28 — **5 AI subsystems surfaced + analyzed** (per RAW_VISION's algorithmic-innovation probe ask): (1) Event-driven Customer Profile Builder + AI-Native Stores, (2) Context-Resolving Query Service, (3) Agent Platform + Omnichannel Orchestrator (6 registries), (4) LLM Gateway + Safety + Model Hub + Eval/Cost (foundational; MVP-1), (5) AI Coworker Platform for Internal Ops. All five filed in `NOVEL_IDEAS.md` with full novelty analysis. All five filed in `RECOMMENDED_ADDITIONS.md` for STORY-012 MVP-1-scope evaluation. AI cost management + per-tenant budgeting also filed. STORY-009 architecture grooming now has 5 mandatory ADRs queued. Next: Q3 — kit-promise model (fork-once / subscribe-to-upstream / hybrid) — AI-first weights this strongly toward subscribe-to-upstream
- 2026-04-28 — **Q3 locked**: kit-promise = **hybrid + thin-shell + packages**. Subscribe-to-upstream for platform layers + AI subsystems + adapters + deploy script; fork-once for white-label brand + product code + custom UI. Logged as D-16. AC #3 ticked. Section in `GROOMED_FEATURES.md` populated
- 2026-04-28 — **D-17 logged**: **AI-assisted upstream merge** confirmed as a first-class MVP-1+ feature anchoring the AI-first + subscribe-to-upstream story. Agent detects upstream updates, examines user customizations via adapter usage signatures, proposes merge plans, tests against user tests, surfaces only low-confidence conflicts. Combines AI Subsystem 5's mechanism with the kit-promise. Filed in `NOVEL_IDEAS.md` (medium-high novelty) and `RECOMMENDED_ADDITIONS.md` (MVP-1 phase fit). Implies AI Subsystem 5 needs a "lite" boundary — full Subsystem 5 is v2, but the merge-helper subset ships MVP-1. STORY-009 ADR queue grows: 5 (per AI subsystem) + 1 (kit-promise architecture) + 1 (AI-assisted merge mechanism) + STORY-009's existing slate (tenancy, event bus, observability, auth, ML platform, data quality) = STORY-009 may need to split. Next: Q4 — pre-auth marketing site placement (same repo / sibling repo)
- 2026-04-28 — **Q4 locked**: marketing site = **sibling repo** (default) + monorepo with separate deploys (documented alternative) + brand as third `@starter-saas/brand` package. Status page = **separate** (D-19): own repo or managed service (Statuspage / Instatus). Logged as D-18 + D-19. AC #4 ticked. Section "Site topology" added to `GROOMED_FEATURES.md`. User raised polyrepo question — clarified as two distinct topologies (publishing already locked as polyrepo-shaped via D-16; development topology = monorepo with workspaces, preliminary; final lock in STORY-010 alongside package-manager pick). Added `repo-topology` and `package-manager` rows to DECISIONS_LOG open/pending. Removed `marketing-site` row. Next: Q5 — white-label mechanism direction (config-driven / code-gen / plugin-driven)
