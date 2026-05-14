---
id: STORY-016
title: Fastify gateway + Zod boundary discipline + plugin extension points
type: story
status: in-progress
priority: P0
estimate: L
parent: EPIC-004
phase: mvp
tags: [mvp, gateway, fastify, zod]
created: 2026-05-06
updated: 2026-05-11
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
- 2026-05-11 — picked up. Sub-PR plan: (#1) new `@starter-saas/gateway` package — Fastify v5 factory + Zod type provider + structured 400 error formatter + kit-default `/health` route + `tenantContextPlugin` decorating `request.tenantId` and optionally wiring the per-tenant rate-limit middleware from `@starter-saas/tenancy`; (#2) auth-context plugin wiring `@starter-saas/auth` sign-in / sign-up / magic-link flows behind routes; (#3) `apps/starter` minimal entry running the gateway end-to-end. Per the story description, the gateway "lives in `apps/starter`" — but factored as a reusable `@starter-saas/gateway` package so adopters get a kit-defaults factory while `apps/starter` becomes the reference impl that calls it.
- 2026-05-11 — **Sub-PR #1 in progress**: `@starter-saas/gateway` package with `createGateway()` factory + Zod type provider + structured 400 error formatter + Zod-schema'd `/health` (with serializer-side response validation catching handler bugs) + `tenantContextPlugin` (decorates `request.tenantId`, optional per-tenant rate-limit preHandler via `createRateLimitMiddleware` from `@starter-saas/tenancy`). Uses `fastify-plugin` for cross-encapsulation decorator visibility + `fastify-type-provider-zod` v4 for Zod-typed route schemas. 11 new tests: 6 factory (boot / `/health` default + opt-out / 400 on invalid body with structured issues / handler sees typed body / serializer catches wrong response shape) + 5 tenant-context (header extraction / null on missing / custom extractor override / rate-limit enforced after maxPerWindow / rate-limit skips when no tenant in scope). **Total test count: 192** (48 auth + 10 event-bus + 11 saga + 6 cli + 106 tenancy + 11 gateway). Typecheck + build + test green across 10 packages.
