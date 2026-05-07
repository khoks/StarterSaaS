---
id: STORY-016
title: Fastify gateway + Zod boundary discipline + plugin extension points
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-004
phase: mvp
tags: [mvp, gateway, fastify, zod]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Stand up the Fastify-based API gateway for the kit (per [D-24](../../docs/decisions/DECISIONS_LOG.md), [D-25](../../docs/decisions/DECISIONS_LOG.md)). Every public boundary uses Zod schemas (HTTP route inputs/outputs, plugin extension-point signatures, event-bus message schemas); strict TS mode in every package. Per-tenant context middleware extracts active tenant from session (per STORY-013). Plugin extension points exposed for adopter customization per layered white-label model (D-20).

## Acceptance criteria

- [ ] Fastify gateway scaffolded in `apps/starter` with TypeScript strict mode
- [ ] Fastify-Zod plugin (or equivalent) installed; routes use Zod schemas for input/output validation
- [ ] Invalid request → 400 with structured Zod error
- [ ] Per-tenant context middleware extracts active tenant from session
- [ ] Per-tenant rate-limit middleware integrates from STORY-014
- [ ] Plugin extension points exposed via Zod-schema'd interface (per [ADR-0013](../../docs/architecture/ADR-0013-plugin-spec-and-ai-compat.md))
- [ ] OTel auto-instrumentation enabled
- [ ] `/health` endpoint returns 200 with system status
- [ ] Smoke test: invalid request rejected; valid request processed; tenant context flows; OTel span emitted

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: every API endpoint in subsequent Stories
- Blocked by: STORY-013 (auth + session); STORY-014 (tenant context)

## Related

- ADRs: [ADR-0013](../../docs/architecture/ADR-0013-plugin-spec-and-ai-compat.md)
- Decisions: D-24, D-25, D-20

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
