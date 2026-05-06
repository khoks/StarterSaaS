---
id: EPIC-008
title: UX + Deploy — brand package, marketing-template, deploy CLI + command portal
type: epic
status: backlog
priority: P0
phase: mvp
tags: [mvp, ux, brand, marketing, deploy, cli, portal]
created: 2026-05-05
updated: 2026-05-05
---

## Goal

Ship the **adopter-facing surfaces** for MVP-1: brand package + marketing-template + deploy CLI with command portal. These are the surfaces an adopter touches first — first-impression cost is high.

## Capabilities (per [docs/roadmap/MVP.md](../../docs/roadmap/MVP.md))

- **Brand package** (`@starter-saas/brand`) ([D-49](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0017](../../docs/architecture/ADR-0017-status-brand-admin.md)) — logo (SVG primary + PNG fallbacks at 512/256/128/64/32) + color tokens (palette + semantic) + typography tokens + copy snippets + OG images + favicons; Tailwind config consumes brand tokens → CSS variables in `apps/starter` and `packages/marketing-template`; adopter customization via fork OR `starter.config.ts → brand: {...}` overrides OR `brand: { mode: "raw" }` opt-out for direct HTML/CSS
- **Marketing-template** (`packages/marketing-template`, Astro) ([D-18](../../docs/decisions/DECISIONS_LOG.md) / [D-27](../../docs/decisions/DECISIONS_LOG.md)) — sibling-repo template adopter forks; Astro multi-framework support (HTML / React / Vue / Svelte islands); SEO + partial hydration; brand integration via `@starter-saas/brand` import; default sections: hero, pricing, blog, docs, contact, terms / privacy
- **Deploy CLI + command portal** ([D-42](../../docs/decisions/DECISIONS_LOG.md) / [D-43](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0018](../../docs/architecture/ADR-0018-deploy-portal-mechanism.md)) — `@starter-saas/cli` with subcommands `init` / `deploy` / `tenant` / `teardown` / `doctor`; 10-step idempotent deploy flow; Pulumi-native idempotency; interactive secrets default + `--env-file` + `--from-secrets-manager`; AI-assisted opt-in via `--ai-assist`; anonymous telemetry opt-in default-OFF; triple-confirm teardown; default 30-min timeout; **deploy command portal** local web/TUI showing real-time per-step status + pause/resume/abort + streamed logs + AI-generated narration via LLM Gateway with prompt caching; default port 7732 with conflict detection + scan to 7799; `--no-portal` minimal mode for CI; `--no-narration` for cost-conscious

## Scope

- `@starter-saas/brand` package with all token categories
- Tailwind plugin to generate CSS variables from brand tokens
- Brand override mechanism via `starter.config.ts`
- `packages/marketing-template` Astro site (default sections + brand-integrated)
- Adopter-fork workflow for marketing site (sibling repo)
- `@starter-saas/cli` package with all subcommands
- 10-step deploy flow implementation: validate → cloud auth → state bootstrap → ai-assist offer → network → data → schema-per-tenant init → app services → smoke tests → success summary
- Pulumi automation API integration (programmatic; not shelled out)
- Secrets bootstrap (interactive + `--env-file` + `--from-secrets-manager`)
- Triple-confirm teardown with explicit data-loss warning
- Default 30-min timeout (safety net)
- Local web server for deploy command portal (Fastify per D-24)
- React dashboard for portal showing 10-step status + controls
- TUI fallback (Ink-style) for `--no-open` / headless
- Pause / resume state machine at Pulumi resource boundaries
- Abort via Pulumi cancel API (no orphaned resources)
- AI narration prompt templates per step + aggressive prompt caching
- Anonymous telemetry (opt-in only) with adopter-config gate
- `doctor` subcommand for state diagnosis + drift detection
- `tenant` subcommand subtree (`provision` / `migrate` / `delete` / `restore`)
- Cross-CLI: portal events, telemetry, AI narration all integrate with EPIC-006 LLM Gateway + EPIC-005 observability

## Out of scope (deferred per MVP.md § Out of scope)

- `--dry-run` flag for deploy (v1+)
- Advanced admin UI for deploy management (v1+)
- Multi-cloud per adopter (v1+)
- Multi-region per cloud (v1+)
- Mobile companion view via QR code (v1+)
- WebSocket-based portal (v1+; SSE MVP-1)
- Brand asset CDN integration (v1+)
- Marketing site CMS integration (v1+)

## Stories under this Epic

(Drafted in [STORY-012](../stories/STORY-012-mvp1-scope-lockdown.md) Q2; ≥3 expected.)

## Exit criteria

- [ ] `npx @starter-saas/cli init --ai-assist` scaffolds working thin shell with NL-generated config (per EPIC-007)
- [ ] `npx @starter-saas/cli deploy` runs all 10 steps idempotently
- [ ] Deploy command portal opens at http://localhost:7732; shows real-time step status
- [ ] Pause / resume works at resource boundaries; abort routes through Pulumi cancel
- [ ] AI narration explains each step in plain English; cached prompts make cost bounded
- [ ] `--no-portal` / `--no-narration` headless mode works for CI
- [ ] `cli teardown` requires triple-confirm + explicit data-loss acknowledgment
- [ ] `cli doctor` surfaces drift / health / recommended actions
- [ ] `cli tenant migrate` runs Drizzle migrations against tenant schemas (uses EPIC-003 logic)
- [ ] Brand package: changing `starter.config.ts → brand: { primaryColor }` updates Tailwind theme + ai-ui components + marketing-template
- [ ] `brand: { mode: "raw" }` bypasses tokens cleanly
- [ ] Marketing template Astro site renders with default sections + adopter-overridden brand
- [ ] Integration test: founder's-first-engineer demo — `init --ai-assist` → `deploy` (with portal narration) → ~30 minutes total → adopter sees branded SaaS deployed end-to-end

## Related

- ADRs: [ADR-0017](../../docs/architecture/ADR-0017-status-brand-admin.md), [ADR-0018](../../docs/architecture/ADR-0018-deploy-portal-mechanism.md), also [ADR-0003](../../docs/architecture/ADR-0003-cloud-target.md) for the deploy infra
- Decisions: D-13 (persona; first-impression matters), D-15 (one-command deployable headline), D-18, D-27, D-29 (ai-ui used in portal narration), D-42, D-43, D-49
- Cross-Epic: depends on EPIC-003 (tenant context for `cli tenant`) + EPIC-004 (events for portal state) + EPIC-005 (observability + status page) + EPIC-006 (LLM Gateway + ai-ui for portal narration) + EPIC-007 (AI-assisted config gen integration)

## Activity log

- 2026-05-05 — created as part of MVP-1 surface lockdown ([D-56](../../docs/decisions/DECISIONS_LOG.md))
