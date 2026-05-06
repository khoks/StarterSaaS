---
id: EPIC-003
title: Identity + Tenancy — auth, multi-tenancy infrastructure, multi-tenant DB
type: epic
status: backlog
priority: P0
phase: mvp
tags: [mvp, identity, tenancy]
created: 2026-05-05
updated: 2026-05-05
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

(Drafted in [STORY-012](../stories/STORY-012-mvp1-scope-lockdown.md) Q2; ≥3 expected. Phase D expands each.)

## Exit criteria

- [ ] User can sign up via email+password and create a new tenant; provisioning saga runs successfully end-to-end
- [ ] User can sign in via magic link / OAuth providers; session is tenant-aware
- [ ] Multi-tenant user can switch between tenants via UI; permissions update per active tenant
- [ ] `tenant migrate --tenant=<id>` runs Drizzle migrations against a single tenant schema; `tenant migrate` runs against all
- [ ] Tenant archival: soft archive immediate (reads → 410); hard delete after retention; `legal_hold` blocks
- [ ] Cross-schema queries via `withTenants()` work with permission filtering
- [ ] Audit log captures sign-in / sign-out / password change / role change events
- [ ] Per-tenant rate limit middleware enforces 100 q/s default
- [ ] Integration test: provision tenant → user signs in → invokes API → cross-tenant query blocked → archived → restore window works

## Related

- ADRs: [ADR-0004](../../docs/architecture/ADR-0004-multi-tenancy.md) / [ADR-0007](../../docs/architecture/ADR-0007-auth-provider.md)
- Decisions: D-13, D-32, D-33, D-44, D-48
- Cross-Epic dependencies: feeds EPIC-004 (event bus uses `platform.outbox`), EPIC-005 (observability uses `platform.audit_log`), EPIC-006 (LLM Gateway uses session for per-tenant attribution)

## Activity log

- 2026-05-05 — created as part of MVP-1 surface lockdown ([D-56](../../docs/decisions/DECISIONS_LOG.md))
