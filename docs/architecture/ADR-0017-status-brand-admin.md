# ADR-0017 — Status-page adapters + brand-package mechanism + admin-UI adapter contract

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)
- **Supersedes:** (none)
- **Superseded by:** (none)

---

## Context

Three loosely related but distinct customization surfaces, all locked together because they share the customization theme and benefit from a single grooming session:

- **Status page** ([D-19](../decisions/DECISIONS_LOG.md)) — public-facing uptime / incident communication; lives at `status.<adopter-domain>`; never co-located with the app
- **Brand package** ([D-18](../decisions/DECISIONS_LOG.md)) — `@starter-saas/brand` shipped MVP-1 with logo / color / typography / copy tokens; consumed by both `apps/starter` and `packages/marketing-template`
- **Admin UI adapter** ([D-20](../decisions/DECISIONS_LOG.md), [RECOMMENDED_ADDITIONS](../vision/RECOMMENDED_ADDITIONS.md)) — non-engineer-friendly editor over a subset of `starter.config.ts`; v1+ scope, but the **contract** locked MVP-1 so v1+ implementations have a stable target

## Decision

### Status page adapters

| Adapter | Phase | Notes |
|---|---|---|
| **Built-in lightweight self-hosted** | **MVP-1 default** | Kit ships a minimal status page that adopter deploys on its own subdomain. Read-only. Auto-updated from observability incidents per [ADR-0006](./ADR-0006-observability.md). Stateless; reads from `platform.observability_events`. |
| **Instatus** | MVP-1 | Free tier exists; popular. Adapter pushes incident updates to Instatus API. |
| **Atlassian Statuspage** | v1+ | Enterprise; expensive but standard for B2B SaaS. |
| **Better Stack (Better Uptime)** | v1+ | Modern alternative to Statuspage. |
| **Cachet** | v1+ | Self-hosted PHP; legacy but still in use. |

**Severity tiers (4 standard levels):** operational / degraded / partial outage / major outage.

**Integration with observability** ([ADR-0006](./ADR-0006-observability.md)):

- Incidents emitted to event bus on `platform.incident` topic
- Status page adapter subscribes; updates its surface accordingly
- Adopter's incident-management workflow can promote events to the status page (via API or admin UI)

### Brand package (`@starter-saas/brand`)

Ships MVP-1 with:

| Token category | Content |
|---|---|
| **Logo** | SVG primary; PNG fallbacks at 512 / 256 / 128 / 64 / 32 |
| **Color tokens** | Primary, secondary, accent, neutral palette (50-950 scale); semantic colors (success / warning / error / info) |
| **Typography tokens** | Font families (heading + body); sizes (xs..6xl); weights (300..900) |
| **Copy snippets** | Product name, tagline, SEO descriptions, footer copy |
| **OG images** | Social sharing previews (default + per-page templates) |
| **Favicon + app icons** | Standard set (favicon.ico, apple-touch-icon, android-chrome variants) |

**Generation:**

- Tailwind config consumes brand tokens → CSS variables
- React components in `packages/ui` consume brand tokens via context / CSS variables
- Marketing template (`packages/marketing-template`) imports brand tokens at build time

**Adopter customization paths:**

| Path | When |
|---|---|
| **Override individual tokens via `starter.config.ts → brand: { ... }`** | Common case (logo + primary color + product name) |
| **Fork `@starter-saas/brand` into adopter's repo** | Heavy customization; adopter takes ownership of the package |
| **`brand: { mode: "raw" }`** | Adopter prefers direct HTML/CSS; bypasses tokens entirely |

### Admin UI adapter contract (MVP-1; impl v1+)

The contract is locked MVP-1 so v1+ adapter implementations have a stable target. **No implementation ships in MVP-1.**

```typescript
interface AdminUIAdapter {
  // Renderable surfaces (per-section components the adapter produces)
  renderBranding(brandConfig: BrandConfig): UIComponent;
  renderFeatureFlags(features: FeatureFlagsConfig): UIComponent;
  renderTenantManagement(tenants: TenantSummary[]): UIComponent;
  renderRBAC(roles: Role[], permissions: Permission[]): UIComponent;
  renderObservabilityDashboards(): UIComponent;
  renderUserManagement(users: UserSummary[]): UIComponent;
  renderAuditLog(filters: AuditLogFilters): UIComponent;
  // Admin UI is mounted at /admin (post-auth, RBAC-gated)
}

// Sections the adapter does NOT render — engineer-only via TS:
//   Tech stack picks (D-24..D-38)
//   Cloud target (D-39..D-41)
//   Adapter selections (D-46 backend, D-47 LLM provider, etc.)
//   Plugin extension-point declarations (D-23)
//   Deploy script behavior (D-42)
```

**Authorization:** always RBAC-gated to `platform_admin` role (per [ADR-0007](./ADR-0007-auth-provider.md)). Separate from per-tenant admin role.

**Source-of-truth boundary:** `starter.config.ts` remains the source-of-truth for engineer-managed config. Admin UI writes back to the file (via API endpoint that updates a database mirror, with audit trail) for admin-editable subsets only.

### Side picks (locked)

| Setting | Default |
|---|---|
| Status page severity tiers | operational / degraded / partial outage / major outage |
| Brand package opt-out mode | `brand: { mode: "raw" }` bypasses tokens |
| Admin UI authorization | `platform_admin` role required (per ADR-0007) |
| Admin UI source-of-truth | `starter.config.ts` for engineer-managed; DB mirror for admin-editable subsets |
| Admin UI audit trail | Every admin-UI write event → `platform.audit_log` |

## Considered alternatives

### Status page

- **Atlassian Statuspage as MVP-1 default** — rejected: paid ($79/mo+ at the lowest meaningful tier); D-13 self-host preference matters.
- **Custom heavy status page** (kit-builds-its-own) — rejected: scope creep; lightweight built-in is enough for MVP-1 demo + small-adopter use.
- **No MVP-1 status page** (defer to v1+) — rejected: D-15 promises "production-grade" — uptime communication is a basic production primitive.

### Brand package

- **No brand package** (each adopter wires brand themselves) — rejected: D-13 first-engineer demo flow benefits from a "change logo + color, deploy" experience.
- **Brand-as-data-only** (no Tailwind integration) — rejected: defeats the simplification; if adopter has to wire CSS themselves, why have the package?
- **Tightly coupled brand + UI components** (no `mode: "raw"` opt-out) — rejected: forces Tailwind on adopters; some teams want direct HTML/CSS.

### Admin UI

- **Admin UI MVP-1 (full implementation)** — rejected: scope creep; D-20 deferred to v1+ adapter; `starter.config.ts` is sufficient for D-13 first engineer.
- **No admin UI contract MVP-1** (defer everything to v1+) — rejected: contract churn would break v1+ adapter implementations; locking the interface MVP-1 lets them target a stable surface.
- **Admin UI as the source-of-truth** (DB instead of `starter.config.ts`) — rejected: source-of-truth should be the file (git-tracked, code-reviewed); DB mirror for admin-editable subsets only.
- **Admin UI exposing engineer-only config** — rejected: tech stack changes via UI clicks would break the kit; engineer ownership of those decisions matters.

## Consequences

### Positive

- **Status page MVP-1 honors D-15 production-grade promise** — adopter has uptime communication out of the box.
- **Built-in lightweight + Instatus** covers the spectrum: zero-cost self-hosted for indie adopters, polish-managed for adopters who pay.
- **Brand package preserves D-18 + D-16** — independently subscribable; adopter forks for full control or overrides tokens for lightweight customization.
- **`brand: { mode: "raw" }` opt-out** — non-Tailwind adopters not blocked.
- **Admin UI contract locked MVP-1** — v1+ adapter implementations target a stable interface; prevents breaking-change churn.
- **Engineer-only config never in admin UI** — protects D-13 ownership of foundational decisions.

### Negative / accepted tradeoffs

- **Built-in status page adds MVP-1 scope** — small cost; mitigated by minimal feature surface (read-only, auto-updated).
- **Brand package "tokens vs raw" mode adds documentation surface** — adopters must understand the choice. Mitigation: clear default; `mode: "raw"` is an explicit opt-out.
- **Admin UI contract may need iteration** — v1+ implementations may surface gaps. Mitigation: contract designed to be additive (new render methods, no breaking changes); document migration if breakage required.
- **Audit log writes for every admin-UI change** — adds DB writes. Mitigation: DB load is small; observability surfaces if it grows.

### Cross-cutting

- **ADR-0006 (observability)** — incidents emitted to bus → status page adapter subscribes.
- **ADR-0007 (auth)** — admin UI authorization via `platform_admin` role; audit log integration.
- **ADR-0010 (Agent Platform — coming next)** — admin UI may surface agent management as a v1+ enhancement.
- **D-22 (AI-assisted config gen)** — admin UI could expose NL-driven config edits for non-engineers (v1+ enhancement).
- **D-43 (deploy command portal)** — uses brand package for theming during deploy.

## Implementation notes

- **`packages/status-page-builtin`** — minimal status page; React + static; deployed via Pulumi (per [ADR-0003](./ADR-0003-cloud-target.md)) at `status.<adopter-domain>`.
- **`packages/status-page-instatus`** — adapter using Instatus API; webhook pushes incident events to Instatus.
- **`packages/brand`** — token files (TS objects) + asset bundling + Tailwind plugin generator.
- **`packages/admin-ui`** — contract definition only at MVP-1; types + interfaces; no React implementation.
- **`packages/admin-ui-default-react`** (v1+) — first concrete admin UI adapter; ships with the kit's `apps/starter`.
- **Status page incident events** — published on `platform.incident` topic with severity + affected components + message; status page adapters subscribe.
- **Brand asset generation** — build-time step in Turborepo pipeline generates Tailwind config + CSS variables from token files.
- **Admin UI audit** — every config write via the admin UI emits an audit event with `(user_id, tenant_id, change_type, before, after)`.

## Revisit triggers

- **Adopter requests Atlassian Statuspage** at scale → promote v1+ adapter to MVP-1 alongside.
- **Built-in status page becomes feature-creeped** (incident timeline, comments, subscribers, etc.) → spin out as its own ADR.
- **Brand package adopter feedback** — token coverage gaps (e.g., spacing tokens, animation tokens) → expand surface; document as additive.
- **Admin UI contract gaps** — v1+ implementations request additional render methods → contract iteration with versioning discipline.
- **Non-engineer adoption pressure** — design / marketing teams want admin UI MVP-1 → revisit deferral; ship a thin first-version adapter.
- **Multiple admin UI adapters compete** — adopter ecosystem produces multiple implementations → consider canonical reference impl.
