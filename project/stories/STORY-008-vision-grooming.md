---
id: STORY-008
title: Vision grooming — persona, differentiator, kit promise
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-002
phase: scaffolding
tags: [grooming, vision, phase-b]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As a product manager (the user's PM hat), I need to lock the foundational vision questions for StarterSaaS before any architecture or code work starts: who is the primary persona, what's the headline differentiator vs. existing options (Supabase, Pocketbase, Appwrite, AWS Amplify, Firebase, Strapi, Medusa, Saleor), and is the kit's promise "fork once and modify" or "subscribe to upstream and stay updated."

## Acceptance criteria

- [ ] Primary persona decided and documented in `docs/vision/GROOMED_FEATURES.md` § Persona
- [ ] Headline differentiator articulated in one sentence in `docs/vision/GROOMED_FEATURES.md` § Differentiator
- [ ] Kit-promise model (fork-once vs. subscribe-to-upstream vs. hybrid) decided and documented
- [ ] Pre-auth marketing site placement decided (same repo / sibling repo) — feeds into STORY-012
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
