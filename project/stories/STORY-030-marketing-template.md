---
id: STORY-030
title: packages/marketing-template Astro site (sibling repo template)
type: story
status: backlog
priority: P0
estimate: M
parent: EPIC-008
phase: mvp
tags: [mvp, marketing, astro, ux]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Ship `packages/marketing-template` per [D-18](../../docs/decisions/DECISIONS_LOG.md) and [D-27](../../docs/decisions/DECISIONS_LOG.md). Astro-based marketing site template that adopters fork into a sibling repo (`StarterSaaS-marketing` or per-adopter equivalent). Default sections: hero / pricing / blog / docs / contact / terms / privacy. Astro multi-framework support (HTML / React / Vue / Svelte islands) means non-engineer content team can edit. SEO + partial hydration. Brand integration via `@starter-saas/brand` import (per STORY-029).

## Acceptance criteria

- [ ] `packages/marketing-template` Astro project scaffolded
- [ ] Default sections rendered: hero, pricing, blog, docs, contact, terms, privacy
- [ ] Brand tokens consumed at build time from `@starter-saas/brand`
- [ ] SEO meta tags + sitemap + robots.txt + RSS feed
- [ ] OG images generated dynamically per page using brand OG images as base
- [ ] Adopter-fork workflow documented: clone → rename → push to own sibling repo
- [ ] Multi-framework editing: example sections in HTML + React (Vue / Svelte support documented)
- [ ] Default deployment via Pulumi adapter (per STORY-031 cloud target)
- [ ] Integration test: adopter forks template → changes brand tokens + content → builds + deploys to subdomain

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: nothing (leaf)
- Blocked by: STORY-029 (brand package); STORY-031 (deploy CLI for marketing-site deployment)

## Related

- ADRs: [ADR-0017](../../docs/architecture/ADR-0017-status-brand-admin.md)
- Decisions: D-18, D-27

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
