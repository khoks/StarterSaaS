---
id: STORY-016
title: Fastify gateway + Zod boundary discipline + plugin extension points
type: story
status: done
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

- [x] Fastify gateway scaffolded in `apps/starter` with TypeScript strict mode *(sub-PR #3 — `buildApp()` factory in apps/starter wires `@starter-saas/gateway`'s `createGateway` + plugins)*
- [x] Fastify-Zod plugin (or equivalent) installed; routes use Zod schemas for input/output validation *(sub-PR #1 — `fastify-type-provider-zod` v4 wired in `createGateway`)*
- [x] Invalid request → 400 with structured Zod error *(sub-PR #1 — gateway error handler emits `{ error: "validation_error", message, issues? }`)*
- [x] Per-tenant context middleware extracts active tenant from session *(sub-PRs #1 + #2 — `tenantContextPlugin` decorates `request.tenantId`; `authContextPlugin` reconciles with session's `activeTenant.tenantId` taking precedence)*
- [x] Per-tenant rate-limit middleware integrates from STORY-014 *(sub-PR #1 — `tenantContextPlugin`'s `rateLimit` option uses `createRateLimitMiddleware` from `@starter-saas/tenancy`)*
- [ ] Plugin extension points exposed via Zod-schema'd interface (per [ADR-0013](../../docs/architecture/ADR-0013-plugin-spec-and-ai-compat.md)) *(deferred — Fastify's encapsulation + plugin model is the foundation; the formal AI-validated plugin spec from ADR-0013 lands with EPIC-007's AI-plugin-compat work)*
- [ ] OTel auto-instrumentation enabled *(deferred to STORY-019 in EPIC-005; tracing infrastructure is its own subsystem)*
- [x] `/health` endpoint returns 200 with system status *(sub-PR #1 — kit-default Zod-schema'd `/health` route)*
- [x] Smoke test: invalid request rejected; valid request processed; tenant context flows; OTel span emitted *(sub-PRs #1-#3 — 32 tests including 5 end-to-end against PGlite that exercise sign-up → sign-in → /me with bearer + cookie → sign-out → /me 401. OTel span check deferred with the OTel AC above)*

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
- 2026-05-11 — **Sub-PR #1 landed** (PR #38). **Sub-PR #2 in progress**: `authContextPlugin` in `@starter-saas/gateway`. Extracts a session token via adopter extractor (default: `starter-saas-session` cookie OR `Authorization: Bearer <token>` — `defaultTokenExtractor` exported for adopter composition with cookie URL-decode + quoted-value strip + cookie-over-bearer precedence). Resolves token → `Session` (from `@starter-saas/auth`) via adopter-supplied `SessionResolver` port (Auth.js session table / Redis / JWT verification — kit doesn't lock the impl). Decorates `request.session` (Session | null) + `request.user` (SessionUser | null convenience alias). `required: true` mode emits structured 401 for missing/invalid sessions. **Reconciliation with `tenantContextPlugin`**: when both are registered, the session's `activeTenant.tenantId` overrides the header-extracted `request.tenantId` (authenticated truth wins; header-only is fallback for unauthenticated platform endpoints). Resolver errors are swallowed + logged + treated as unauthenticated (upstream session-store outage doesn't 500 every request). 15 new tests: 6 `defaultTokenExtractor` (cookie / bearer / cookie-over-bearer precedence / null fallback / URL-decode / quoted-strip) + 4 non-required mode (decorates on success / null on missing / null on invalid / swallows resolver throws) + 3 required mode (401 on missing / 401 on invalid / pass-through on valid) + 2 reconciliation (session activeTenant overrides header / null activeTenant preserves header). **Total test count: 207** (48 auth + 10 event-bus + 11 saga + 6 cli + 106 tenancy + 26 gateway). Typecheck + build + test green across 10 packages.
- 2026-05-11 — **Sub-PR #2 landed** (PR #39). **Sub-PR #3 in progress**: `apps/starter` reference application. Promotes the previous thin-shell placeholder to a working Fastify app composed via `buildApp()` from `@starter-saas/gateway` + `@starter-saas/auth` + `@starter-saas/tenancy`. Routes: POST `/auth/sign-up` / `/auth/sign-in` / `/auth/sign-out` (calling the existing flow functions from `@starter-saas/auth`) + GET `/me` (auth-required). Adds `createDrizzleSessionResolver(db)` — concrete `SessionResolver` adapter reading `platform.sessions` JOINed against `platform.users` (+ `platform.user_tenant` for active-tenant role + joinedAt). **Auth package type relaxation**: `AuthDb` widened from `PostgresJsDatabase<typeof schema>` to cross-adapter `PgDatabase<PgQueryResultHKT, ...>` so the auth flows work against pglite (already done for tenancy in STORY-015 sub-PR #2). 5 new e2e integration tests against pglite: happy-path (sign-up → sign-in → /me with bearer → /me with cookie → sign-out → /me 401) + duplicate-email 409 + wrong-password 401 + Zod-validation structured 400 + `/health` reachability. Inlined auth-schema DDL in `apps/starter/tests/setup.ts` (the only consumer — extracting to `@starter-saas/auth/testing` waits for a second consumer). **First time the kit exercises a real HTTP layer end-to-end** — unblocks several deferred ACs from EPIC-003 (sign-up via HTTP, 401 on no session, /me returns user info). **Total test count: 212** (48 auth + 10 event-bus + 11 saga + 6 cli + 106 tenancy + 26 gateway + 5 apps/starter). Typecheck + build + test green across 11 packages.
- 2026-05-11 — **STORY-016 done.** All 3 sub-PRs landed. Two ACs explicitly deferred (OTel auto-instrumentation → STORY-019 in EPIC-005 where the observability subsystem belongs; ADR-0013 plugin-spec extension points → EPIC-007 AI-plugin-compat). The Fastify gateway + Zod boundary discipline + plugin extension foundation + tenant + auth context + reference app are all working end-to-end against real Postgres.
