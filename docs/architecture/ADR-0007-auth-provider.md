# ADR-0007 — Auth provider strategy (Auth.js MVP-1 + tenant-aware + RBAC sketch)

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)
- **Supersedes:** (none)
- **Superseded by:** (none)

---

## Context

The kit needs an auth subsystem that integrates with Next.js App Router ([D-27](../decisions/DECISIONS_LOG.md)), the Drizzle + Postgres data layer ([D-32](../decisions/DECISIONS_LOG.md)), schema-per-tenant tenancy ([D-33](../decisions/DECISIONS_LOG.md), [D-44](../decisions/DECISIONS_LOG.md)), and the adapter pattern ([D-16](../decisions/DECISIONS_LOG.md)) so adopters can swap to managed auth providers without rewriting feature code.

Constraints:

- **D-13** (founder's first engineer): the auth library should be one they reach for reflexively
- **D-25** (Zod boundaries): session shape is a typed boundary
- **D-44** (provisioning saga step 4): default roles seeded on tenant provisioning — auth must integrate

## Decision

### MVP-1 default: Auth.js (v5+) with Drizzle adapter

**Auth.js** (formerly NextAuth.js) is the MVP-1 default. Reasons specific to our kit:

- **D-27 alignment.** Auth.js v5+ is the best-integrated auth for Next.js App Router — RSC-friendly, server actions support, middleware-level session checks. Out-of-the-box adoption for D-13.
- **D-32 alignment.** Auth.js Drizzle adapter handles user / session / verification tables in our data layer.
- **D-16 alignment.** Auth.js providers are themselves an adapter pattern; we wrap with a kit-level adapter that lets adopters swap to Clerk / Auth0 / Cognito / etc. without rewriting feature code.

### Auth tables (live in `platform` schema)

```text
platform.users                  global user identity (email, hashed password, name, etc.)
platform.accounts               OAuth provider linkage (provider + provider_account_id → user)
platform.sessions               active sessions (or skip if JWT mode)
platform.verification_tokens    email verification + magic link + password reset tokens
platform.user_tenant            many-to-many: user × tenant memberships
platform.audit_log              auth events (sign-in, sign-out, password change, role change)
```

`platform.user_tenant` is the kit's bridge between auth and multi-tenancy ([D-33](../decisions/DECISIONS_LOG.md)) — a user can belong to multiple tenants (agency rep working for multiple clients; multi-product founder; etc.).

### Auth flows MVP-1

| Flow | MVP-1? | Notes |
|---|---|---|
| Email + password | ✅ | bcrypt cost 12; 12-char min; HIBP breach-check opt-in |
| Magic link (passwordless) | ✅ | Email-driven; serves D-13 demo flow without password ceremony |
| OAuth (Google, GitHub, Apple) | ✅ | Adopter declares which providers in `starter.config.ts` |
| 2FA / TOTP | ✅ | Auth.js supports natively |
| SAML SSO | v1+ | Configuration-heavy; SaaS-buyers need it but MVP-1 adopters less so |
| OIDC (custom IdP) | v1+ | Rare at MVP-1 |
| Passkeys / WebAuthn | v1+ | Maturing standard |

### v1+ adapter slate

| Adapter | Phase | Notes |
|---|---|---|
| **Clerk** | v1+ | Managed; polish-first DX; orgs built-in for tenant story |
| **Auth0** | v1+ | Enterprise-mature; via Organizations for tenants |
| **AWS Cognito** | v1+ (when `cloud: aws`) | Cloud-native managed; via groups |
| **GCP Identity Platform** | v1+ (when `cloud: gcp`) | Cloud-native managed |
| **WorkOS** | v1+ | Enterprise SSO-first; Directory Sync |
| **Authelia** | v1+ | Advanced self-hosted SSO/2FA proxy |
| **Ory Kratos** | v1+ | Enterprise self-hosted; heavy |

Adopter swaps via `starter.config.ts → auth: { adapter: "clerk", config: { ... } }`.

### Tenant-aware auth

- **Active tenant** stored in session; tenant switcher in app UI for users with multiple memberships
- **Default tenant lookup** at sign-in — user with single tenant = auto-route; multi-tenant = picker UI
- **Tenant onboarding flow** — new user creates a tenant on signup OR is invited to an existing tenant via email
- **Tenant invite flow** — admin sends invite via `platform.user_tenant_invites` (token-based, 7-day expiry)

### RBAC integration sketch

Roles defined per-tenant in tenant schema:

```text
tenant_xyz.roles           (id, name, description) — admin / member / viewer seeded by ADR-0004 step 4
tenant_xyz.permissions     (id, name) — domain-specific permissions
tenant_xyz.role_permissions (role_id, permission_id)
tenant_xyz.user_roles      (user_id, role_id)
```

- Default roles seeded on tenant provisioning per [ADR-0004](./ADR-0004-multi-tenancy.md) step 4
- Permission checks via Fastify middleware: `requireRole("admin")` / `requirePermission("users.delete")`
- Session includes user's role for the active tenant

**Full RBAC subsystem ADR deferred to a future story.** This ADR-0007 sketches the integration; full design (custom permissions, hierarchical roles, attribute-based access, etc.) is its own ADR scope.

### Side picks (locked)

| Setting | Default | Adopter-tunable? |
|---|---|---|
| Password policy | 12-char minimum; bcrypt cost 12 | Yes |
| Password breach check | HaveIBeenPwned k-anonymity API, opt-in | Yes |
| Session storage | DB-backed in `platform.sessions` | Yes (JWT mode opt-in for stateless) |
| Session lifetime | 30 days rolling; 7-day idle timeout | Yes |
| Password reset | Token-based via email; 1-hour expiry; one-time-use | Yes |
| Email verification | Required for password sign-up; optional for OAuth | Yes |
| Account lockout | 5 failed attempts → 15-min lockout | Yes |
| Audit log | Sign-in / sign-out / password change / role change → `platform.audit_log` | No (location fixed) |

## Considered alternatives

- **Clerk as MVP-1 default** — rejected: managed-only; D-13 self-host preference matters; adopter must sign up before MVP-1 demo. v1+ adapter for adopters who prefer polish.
- **Lucia Auth** — rejected: lighter than Auth.js but more code to write; Auth.js v5 has stabilized and the trade-off no longer favors lightweight.
- **Auth0 as MVP-1 default** — rejected: enterprise-mature but not first-engineer-reflexive; v1+ adapter for adopters who want it.
- **Building custom auth from scratch** — rejected: reinventing well-trodden ground; security risk; community wouldn't trust kit's auth.
- **Cloud-native (Cognito / Identity Platform) as MVP-1 default** — rejected: cloud-locked; can't run cross-cloud or local-dev cleanly.
- **JWT-only sessions** — considered as default; rejected: DB-backed sessions are easier to revoke (logout-everywhere, security-incident response). JWT mode opt-in for adopters who want stateless.
- **Passwordless-only flows** — considered (skip email + password entirely); rejected: still common adopter expectation; can be disabled per `starter.config.ts`.

## Consequences

### Positive

- **First-engineer-friendly default** — Auth.js is the de-facto choice for Next.js TS apps in 2026.
- **Tenant-aware out of the box** — `platform.user_tenant` bridge is a clean pattern; multi-tenant users handled at MVP-1.
- **Self-hosted MVP-1** — preserves D-13 zero-additional-deploy preference; no vendor signup required for first deploy.
- **Adapter pattern** — adopters who want managed (Clerk, Auth0, Cognito) swap one config line.
- **Audit log MVP-1** — security audits + compliance reviews land easily.
- **HIBP breach check opt-in** — adopter can enforce password hygiene without legal exposure of breach data.

### Negative / accepted tradeoffs

- **Auth.js maturity surface area is wide** — every release brings churn; mitigation: pin major version + ship migration ADRs when major versions ship.
- **DB-backed sessions add DB load** — mitigated by Postgres being well-suited; JWT mode opt-in for adopters who want stateless.
- **OAuth provider integration adds complexity** — every provider needs setup (callback URLs, redirect handling, etc.); mitigation: kit ships sensible defaults; doctor subcommand surfaces misconfiguration.
- **2FA / TOTP UI requires adopter integration** — Auth.js handles the protocol; adopter renders the QR code + verification UI. Kit ships default React components for this in `packages/ui`.
- **No SAML / OIDC at MVP-1** — enterprise SaaS-buyers may need it; v1+ adapter is the right pacing.

### Cross-cutting

- **ADR-0004 (multi-tenancy)** — provisioning saga step 4 seeds default roles in `tenant_xyz.roles`; this ADR's RBAC sketch defines the schema.
- **ADR-0006 (observability)** — auth events surfaced in observability dashboards (failed-sign-in spike alerts, etc.).
- **ADR-0017 (admin UI)** — admin UI adapter contract includes RBAC management surface.
- **ADR-0011 (LLM Gateway)** — Gateway uses session context for per-user attribution + per-tenant budget enforcement.
- **Future RBAC ADR** — extends this ADR's sketch with full permission model.

## Implementation notes

- **`packages/auth`** — Auth.js v5+ wrapper + kit-level adapter contract.
- **Adapter packages** — `@starter-saas/auth-clerk`, `@starter-saas/auth-auth0`, `@starter-saas/auth-cognito`, `@starter-saas/auth-gcp-identity-platform`, `@starter-saas/auth-workos`, `@starter-saas/auth-authelia`, `@starter-saas/auth-ory-kratos`.
- **`packages/auth-ui`** — React components for sign-in / sign-up / forgot-password / 2FA setup / tenant switcher; framework-agnostic per [D-27](../decisions/DECISIONS_LOG.md).
- **Session shape** Zod-defined and exported from `packages/auth/src/contracts/session.ts`.
- **Drizzle migrations** — Auth.js Drizzle adapter migrations live in `packages/auth/src/migrations/` and are run as part of platform schema migrations.
- **Audit log writer** — Fastify hook on auth events publishes to event bus per [D-45](../decisions/DECISIONS_LOG.md); consumer writes to `platform.audit_log`.

## Revisit triggers

- **Auth.js v6+ ships breaking changes** — write migration ADR; pin v5 until ready.
- **First adopter requests enterprise SAML SSO** — promote SAML adapter from v1+ to v1.
- **Passkeys / WebAuthn maturity** — Apple / Google adoption hits critical mass → consider promoting from v1+ to v1.
- **DB-backed session load becomes a bottleneck** — adopter at scale → consider JWT mode default switch (or per-tenant configuration).
- **First adopter on Cognito / Identity Platform** → mature the cloud-native adapter; consider promoting to MVP-1 alongside cloud target.
- **RBAC complexity grows** — adopter requests attribute-based access, hierarchical roles, fine-grained permissions → write the dedicated RBAC subsystem ADR.
