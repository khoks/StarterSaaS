---
id: STORY-029
title: @starter-saas/brand package + Tailwind tokens + adopter customization
type: story
status: backlog
priority: P0
estimate: M
parent: EPIC-008
phase: mvp
tags: [mvp, brand, tailwind, ux]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Ship `@starter-saas/brand` per [D-49](../../docs/decisions/DECISIONS_LOG.md) and [ADR-0017](../../docs/architecture/ADR-0017-status-brand-admin.md). Token categories: logo (SVG primary + PNG fallbacks at 512/256/128/64/32), color tokens (palette + semantic colors), typography tokens (font families + sizes + weights), copy snippets (product name + tagline + SEO descriptions), OG images, favicon + app icons. Tailwind config consumes brand tokens → CSS variables in `apps/starter` and `packages/marketing-template`. Adopter customization: fork the package OR override individual tokens via `starter.config.ts → brand: { ... }` OR `brand: { mode: "raw" }` to bypass tokens for direct HTML/CSS.

## Acceptance criteria

- [ ] `packages/brand` ships with all token categories
- [ ] Tailwind plugin generates CSS variables from token files
- [ ] Brand assets bundled (logo + favicons + OG images)
- [ ] Adopter override via `starter.config.ts → brand: { logoUrl, colors, fontFamily, ... }`
- [ ] `brand: { mode: "raw" }` opt-out bypasses tokens cleanly
- [ ] `apps/starter` consumes brand tokens via Tailwind variables
- [ ] `packages/ai-ui` components consume brand tokens via context (per STORY-023)
- [ ] `packages/marketing-template` consumes brand tokens at build time (per STORY-030)
- [ ] Integration test: adopter changes `brand.colors.primary` → all surfaces (app + ai-ui + marketing) update consistently

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: STORY-023 (ai-ui needs brand tokens); STORY-030 (marketing-template needs brand tokens); STORY-028 (Agent Platform UI shell themed via brand)
- Blocked by: nothing (foundation Story)

## Related

- ADRs: [ADR-0017](../../docs/architecture/ADR-0017-status-brand-admin.md)
- Decisions: D-18, D-49

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
