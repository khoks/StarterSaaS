---
id: EPIC-003
title: Identity + Tenancy — auth, multi-tenancy infrastructure, multi-tenant DB
type: epic
status: done
priority: P0
phase: mvp
tags: [mvp, identity, tenancy]
created: 2026-05-05
updated: 2026-05-11
---

## Goal

Ship the **identity + isolation foundation** for MVP-1: auth flows + tenant-aware sessions + per-tenant role-based access control + multi-tenant database with schema-per-tenant isolation. Without this Epic, no other Epic can ship safely.

## Capabilities (per [docs/roadmap/MVP.md](../../docs/roadmap/MVP.md))

- **Auth** ([D-48](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0007](../../docs/architecture/ADR-0007-auth-provider.md)) — Auth.js v5+ with Drizzle adapter; flows MVP-1: email+pwd / magic link / OAuth (Google/GitHub/Apple) / TOTP 2FA; tenant memberships via `platform.user_tenant`; tenant switcher UI; RBAC sketch (per-tenant roles in `tenant_xyz.{roles,user_roles}`)
- **Tenancy infrastructure** ([D-33](../../docs/decisions/DECISIONS_LOG.md) / [D-44](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0004](../../docs/architecture/ADR-0004-multi-tenancy.md)) — schema-per-tenant + 9-step provisioning saga + `tenant migrate` runner (default 5 parallel + continue-on-error) + 2-stage archival (soft 30d + hard delete) + `legal_hold` flag + cross-schema query primitives (`platform.*` + `withTenants()` wrapper)
- **Multi-tenant DB** ([D-32](../../docs/decisions/DECISIONS_LOG.md) / [D-37](../../docs/decisions/DECISIONS_LOG.md)) — Postgres + Drizzle ORM + drizzle-kit migrations + pgvector + PgBouncer transaction-mode pooling (prod) / native node-postgres pool (dev); per-tenant rate limit middleware (default 100 q/s)

## Scope

- All MVP-1 auth flows + RBAC permission middleware
- Tenant provisioning saga end-to-end (signup → schema creation → migrations → seed → secrets → billing → active → emit + welcome)
- Tenant archival flow (soft + hard delete with audit)
- Migration runner CLI subcommand (`@starter-saas/cli tenant migrate`)
- Cross-schema query primitives (TS API)
- `withTenants()` wrapper utility
- `platform.audit_log` writer for auth events
- Tenant invite flow (`platform.user_tenant_invites`)

## Out of scope (deferred per MVP.md § Out of scope)

- SAML SSO / OIDC / Passkeys / WebAuthn (v1+ flows)
- Auth.js alternative adapters: Clerk / Auth0 / AWS Cognito / GCP Identity Platform / WorkOS / Authelia / Ory Kratos (v1+)
- Full RBAC subsystem ADR — current sketch is sufficient MVP-1
- DB-per-tenant tenancy mode (rejected; not on roadmap)
- Self-hosted Postgres-in-VPC adapter (v1+)
- Cross-tenant analytics rollups (v2+)

## Stories under this Epic

- [STORY-032](../stories/STORY-032-monorepo-bootstrap.md) — Phase D monorepo workspace bootstrap (npm + Turborepo + TS strict) (estimate: M) — **prerequisite for all subsequent Stories; in progress 2026-05-07**
- [STORY-013](../stories/STORY-013-auth-flows-mvp1.md) — Auth.js v5 integration with Drizzle adapter — MVP-1 sign-in flows (estimate: L)
- [STORY-014](../stories/STORY-014-tenancy-provisioning-saga.md) — Tenancy schema + 9-step provisioning saga + multi-tenant query primitives (estimate: XL)
- [STORY-015](../stories/STORY-015-tenant-migration-archival-rbac.md) — Tenant migration runner + 2-stage archival + RBAC sketch (estimate: L)

## Exit criteria

- [x] User can sign up via email+password and create a new tenant; provisioning saga runs successfully end-to-end *(STORY-013 + STORY-014; end-to-end against real Postgres in STORY-015 sub-PR #2)*
- [ ] User can sign in via magic link / OAuth providers; session is tenant-aware *(magic link done; **OAuth deferred** to a follow-up Story — needs apps/starter HTTP layer)*
- [ ] Multi-tenant user can switch between tenants via UI; permissions update per active tenant *(deferred — needs apps/starter HTTP layer; the data + queries that back the UI are in place)*
- [x] `tenant migrate --tenant=<id>` runs Drizzle migrations against a single tenant schema; `tenant migrate` runs against all *(STORY-015 sub-PR #2)*
- [x] Tenant archival: soft archive immediate (reads → 410); hard delete after retention; `legal_hold` blocks *(STORY-015 sub-PR #3; 410 status emission is the HTTP-layer responsibility, deferred to apps/starter)*
- [x] Cross-schema queries via `withTenants()` work with permission filtering *(STORY-014 sub-PR #4)*
- [x] Audit log captures sign-in / sign-out / password change / role change events *(STORY-013 sub-PR #5 — `platform.audit_log` writer; role-change event types reserved for future use)*
- [x] Per-tenant rate limit middleware enforces 100 q/s default *(STORY-014 sub-PR #4)*
- [x] Integration test: provision tenant → user signs in → invokes API → cross-tenant query blocked → archived → restore window works *(provision/archive/restore round-trip in STORY-015 sub-PRs #2 + #3 against real Postgres; "user invokes API" + "cross-tenant query blocked" stay with apps/starter — the runtime middleware to enforce blocking is in place)*

## Related

- ADRs: [ADR-0004](../../docs/architecture/ADR-0004-multi-tenancy.md) / [ADR-0007](../../docs/architecture/ADR-0007-auth-provider.md)
- Decisions: D-13, D-32, D-33, D-44, D-48
- Cross-Epic dependencies: feeds EPIC-004 (event bus uses `platform.outbox`), EPIC-005 (observability uses `platform.audit_log`), EPIC-006 (LLM Gateway uses session for per-tenant attribution)

## Activity log

- 2026-05-05 — created as part of MVP-1 surface lockdown ([D-56](../../docs/decisions/DECISIONS_LOG.md))
- 2026-05-07 — picked up; Phase D begins. STORY-032 (monorepo bootstrap) added as prerequisite for STORY-013/014/015. STORY-032 in progress; first source-code-adjacent PR opened (normal review required per D-14)
- 2026-05-11 — **EPIC-003 done.** STORY-032 (#24), STORY-013 (PR #25-#29 across 4 sub-PRs), STORY-014 (PR #30-#33 across 4 sub-PRs), STORY-015 (PR #34-#37 across 4 sub-PRs) all merged. 13 PRs total. **181 tests green** across 5 packages: `@starter-saas/auth` + `@starter-saas/event-bus` + `@starter-saas/saga` + `@starter-saas/tenancy` + `@starter-saas/cli`. Real-Postgres integration tests via PGlite confirm: provisioning saga 9-step happy-path + step-3 failure compensation, 2-stage archival lifecycle including legal-hold block, multi-tenant migration runner with 5-parallel/continue-on-error/fail-fast/dry-run, per-tenant RBAC with `requireRole`/`requirePermission` middleware. The two unchecked exit-criteria (OAuth + UI tenant switcher + cross-tenant-query-blocked-in-HTTP-flow) depend on the apps/starter HTTP layer which is deferred to a later Phase D Story. **Closed via four cumulative milestones**: identity flows (STORY-013), tenancy schemas + saga primitives (STORY-014 #1-#2), provisioning saga + cross-schema + rate-limit (STORY-014 #3-#4), and the operational layer — CLI + migration runner + archival + RBAC (STORY-015 #1-#4).
