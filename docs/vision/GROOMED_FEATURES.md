# Groomed features — MVP / v1 / v2 / v3

> **Status: placeholder.** This document is filled in during Phase B grooming (EPIC-002). Do not start coding until this is populated and a corresponding `MVP.md` exists.

---

## How to use this doc

For each feature, capture:

- **Name** (short, distinctive)
- **One-line summary** (what value it delivers)
- **Phase** (`MVP` / `v1` / `v2` / `v3`)
- **Subsystem** (auth / RBAC / gateway / billing / notifications / etc.)
- **Dependencies** (other features it requires)
- **Why this phase** (cost vs. value tradeoff)

---

## Persona

**Locked 2026-04-27 in [STORY-008](../../project/stories/STORY-008-vision-grooming.md). Logged as [D-13](../decisions/DECISIONS_LOG.md).**

### Primary — the founder's first engineer at a 1-5 person company

The first technical hire after a founding team has shipped a hacky MVP. They inherit working-but-undisciplined code, a founder who wants product features (not platform work), and a growing customer base that's increasingly demanding. They have 30-60 days to make a credible mark on the platform; adopting StarterSaaS is the high-leverage call they can defend to the founder.

**Why they convert deliberately (where other personas don't):**

| Property | Solo founder | **First engineer** | Small-team CTO | Mid-stage platform team |
|---|---|---|---|---|
| Authority to pick platform | ✓ | **✓** | ✓ | ✓ |
| Urgency | – | **✓** | – | – |
| Technical chops | sometimes | **✓** | ✓ | ✓ |
| Felt-pain | – (Supabase honeymoon) | **✓** | ✓ (already paid the cost) | – (already past it) |
| Conversion behavior | churns through templates | **deliberate adoption** | resistant to rip-and-replace | cherry-picks adapters |

The first engineer is the rare persona with all four properties at once.

**Implications baked into the kit:**

- **Migration paths are first-class.** Fresh-install isn't enough — the first engineer inherits existing code, schemas, auth, and customers. The kit must support: importing existing Postgres schema, wrapping existing auth providers, retrofitting RBAC over a running app, gradual subsystem-by-subsystem adoption. Tracked as a proposal in [`RECOMMENDED_ADDITIONS.md`](RECOMMENDED_ADDITIONS.md).
- **Free / self-host with no per-seat cost.** Engineer recommends, founder approves the budget. Anything that tags per-seat dies in budget review.
- **Subscribe-to-upstream is critical** (refined in STORY-008 Q3 — kit-promise model). Engineer doesn't want to maintain platform code; they want to maintain *product* code.
- **White-label must be config-driven and fast** (refined in STORY-008 Q5). Engineer must demo value to the founder in days, not sprints.
- **Marketing-site placement leans sibling repo** (refined in STORY-008 Q4). Engineer keeps the app codebase clean; marketing lives separately.

### Secondary — solo founder (v1 "lite profile")

A subset of layers enabled by default for founders shipping their first SaaS in a weekend. The full kit is too heavy on day 1; a `--profile lite` preset covers what they actually need (auth + DB + simple gateway + email notifications) and defers ML / ETL / saga / data-quality. Lite profile is **v1, not MVP-1** — MVP-1 is the full small-team kit; lite mode is a configuration on top of it.

### Tertiary — small-team CTO inheriting a kit-adopted codebase

Lifecycle-continuity persona. Today's first engineer is tomorrow's small-team CTO. By the time the company hits 25 people, the engineer who adopted StarterSaaS at month 2 is the one running the platform — they don't churn the kit, they extend it. No special features for them; they're served by the primary persona's design.

### Explicitly NOT primary (out-of-scope for persona-driven decisions)

- **Mid-stage platform teams** (Series B+, 50+ engineers): they build their own platforms or cherry-pick adapters. Treat them as adopters of *individual swappable subsystems*, not the full kit.
- **Non-coders / no-code builders**: out of scope. StarterSaaS assumes the user can read and modify code.
- **Vertical-SaaS founders in regulated industries** (healthcare, fintech, legal): great natural fit, but compliance/audit features are not MVP-1; revisit when those subsystems stabilize in v2+.

## Differentiator

**Locked 2026-04-28 in [STORY-008](../../project/stories/STORY-008-vision-grooming.md). Logged as [D-15](../decisions/DECISIONS_LOG.md).**

### Headline pitch

> **AI-first, production-grade SaaS platform — 30+ integrated layers you will eventually need, white-labelable, one-command deployable.**

### Why this framing wins

| Dimension | Competitive position |
|---|---|
| **AI-first** | Whitespace. No OSS kit (Supabase / Pocketbase / Appwrite / Firebase / Strapi) is positioned AI-first. AWS / Firebase have AI extensions but they're not the headline. |
| **Production-grade** | Differentiates from "weekend toy" kits and from OSS-grade-only options. Signals safety, observability, RBAC, audit out of the box. |
| **30+ integrated layers** | The breadth that nobody else attempts. Names the moat — coordination cost is high, so competitors won't replicate easily. |
| **White-labelable** | Surfaces the agency / vertical-SaaS angle without being niche-only. |
| **One-command deployable** | The demoable proof point — the first engineer shows the founder a working SaaS in minutes. |

### Five AI subsystems anchor the AI-first claim

These are user-proposed (D-15 source). Filed in [`NOVEL_IDEAS.md`](NOVEL_IDEAS.md) for novelty review and in [`RECOMMENDED_ADDITIONS.md`](RECOMMENDED_ADDITIONS.md) for STORY-012 MVP-1-scope evaluation.

| # | Subsystem | Phase fit |
|---|---|---|
| 1 | Event-driven Customer Profile Builder + AI-Native Stores | v1 |
| 2 | Context-Resolving Query Service | v1 |
| 3 | Agent Platform + Omnichannel Orchestrator | MVP-1 subset → v1 full |
| 4 | LLM Gateway + Safety + Model Hub + Eval/Cost | **MVP-1 (foundational)** |
| 5 | AI Coworker Platform for Internal Ops | v2 |

### Tagline-length compressions for marketing

- *"Compete on your product, not on rebuilding 30 layers — AI-first, production-grade, one command deploy."*
- *"The AI-first SaaS platform your first engineer adopts to stop rebuilding."*
- *"30+ integrated layers. AI-first. One command. Yours to white-label."*

(Final marketing copy locked outside Phase B; these are starting points.)

## Kit-promise model

**Locked 2026-04-28 in [STORY-008](../../project/stories/STORY-008-vision-grooming.md). Logged as [D-16](../decisions/DECISIONS_LOG.md), [D-17](../decisions/DECISIONS_LOG.md).**

### Hybrid: subscribe-to-upstream + thin-shell

**Subscribe-to-upstream** for:

- All 30+ platform layers (auth, RBAC, gateway, observability, event bus, etc.)
- All 5 AI subsystems
- Adapter interfaces + reference adapters
- Deploy script

**Fork-once** for:

- White-label brand layer (logo, colors, fonts, copy)
- Product-specific business logic
- Custom UI screens beyond the default kit

### Mechanism: packages + thin shell

Kit code ships as versioned packages. The user's repo is a thin shell that imports them and adds product code.

```text
user-repo/
├── package.json              # subscribes to @starter-saas/* packages
├── shell/                    # USER OWNS — brand, product, custom screens
│   ├── brand/
│   ├── routes/
│   └── adapters/             # user's custom adapter implementations
└── starter.config.ts         # config-driven layer enable/disable + white-label
```

Concrete package manager TBD in [STORY-010](../../project/stories/STORY-010-tech-stack-decision.md).

### AI-assisted upstream merge — first-class feature (D-17)

Anchored by AI Subsystem 5 (Internal Ops Agent). When upstream packages update:

- Agent detects the update
- Examines user customizations via adapter usage signatures
- Proposes a merge plan that minimizes friction
- Tests the proposed merge against the user's test suite
- Surfaces conflicts to a human only when AI confidence is low

Combines two moats — AI-first credibility + subscribe-to-upstream practicality — into one feature: *your kit upgrades itself*. Direct response to the "first engineer doesn't want to maintain platform code" pain. **Phase fit:** MVP-1 (basic: detect + propose + test); v1 (confidence scoring + autonomous-mode toggle). Full novelty analysis in [`NOVEL_IDEAS.md`](NOVEL_IDEAS.md).

### Why hybrid (not pure fork-once or pure subscribe-to-upstream)

- **Pure fork-once is untenable for AI subsystems.** Models, prompts, safety techniques evolve weekly; a 6-month-old fork is 4-5 model generations stale.
- **Pure subscribe-to-upstream removes the escape hatch.** No place to deeply customize a kit subsystem when the founder asks for something unusual. Thin shell IS the escape hatch — vendor a package and customize when needed (acknowledging the local maintenance burden until you un-vendor).

### Tradeoffs

| Aspect | Pro | Con |
|---|---|---|
| Day-1 productivity | Clean separation of concerns | Engineer must learn package interfaces |
| Day-30 productivity | `package update` lands fixes; AI-assisted merge handles conflicts | Vendoring customized packages adds local maintenance |
| Upstream releases | Semver discipline keeps users moving | Breaking-change releases need release-management process |
| White-label | Lives in the shell forever | Engineer must understand shell-vs-package boundary |
| AI subsystem currency | Subscribe ensures models / prompts stay current | Fast-moving upstream needs careful release cadence |

---

## Site topology

**Locked 2026-04-28 in [STORY-008](../../project/stories/STORY-008-vision-grooming.md). Logged as [D-18](../decisions/DECISIONS_LOG.md), [D-19](../decisions/DECISIONS_LOG.md).**

The adopter's SaaS has **three surfaces**, each in its own repo by default:

| Surface | Repo | Audience | Deploy cadence | Editors |
|---|---|---|---|---|
| **Pre-auth marketing site** | sibling repo (`StarterSaaS-marketing` template) | Prospects, search engines | Slow (weekly+) | Eventually non-engineers (content / marketing / design) |
| **App** | adopter's main repo | Authenticated users | Fast (daily+) | Engineers |
| **Status page** | separate repo *or* managed service (Statuspage / Instatus / etc.) | Customers + integrators | Driven by incidents (real-time) | Ops / engineers via adapter |

Post-auth in-app help is **not** a separate surface — it lives with the app.

API / developer-portal docs deferred to [STORY-009](../../project/stories/STORY-009-architecture-grooming.md) — likely co-located with the app source for code-sync, but rendered into the marketing site for browsability.

### Marketing site placement (D-18)

**Default: sibling repo.** Industry-standard (Supabase / Vercel / Stripe / Pocketbase all separate). Each surface evolves on its own deploy cadence; SEO optimization for marketing doesn't fight app SSR strategy; non-engineers can edit marketing without touching app PRs.

**Documented alternative: monorepo with separate deploys.** Single repo with `apps/marketing` + `apps/app`, two deploy targets. Selectable via `starter.config.ts`. Serves the secondary persona (solo founder) who prefers one-repo simplicity. Not recommended for primary persona (first engineer).

**Single-deploy / route-based-split** is explicitly NOT supported — every team that picks it splits later.

### Brand assets (D-18)

Ship as a third package: `@starter-saas/brand` (logo, colors, fonts, copy snippets, OG images). Both marketing and app import from it. Subscribe-to-upstream-style updates apply.

**Opt-out:** users who prefer to duplicate brand assets in each repo can set a flag in `starter.config.ts` and bypass the brand package. Trade: simpler day-1, manual sync forever.

### Status page (D-19)

**Default: separate repo OR managed service.** Lives at `status.<adopter-domain>`. The kit ships an *adapter* — users plug in either a self-hosted status-page (Cachet / Atlassian Statuspage clone) or a managed service. Integrates with the observability subsystem: incidents in the kit trigger status page updates via the adapter.

**Why never co-located with the app:** status page must stay up when the app goes down. Separate hosting is mandatory.

### Kit development repo topology (D-21 — direction locked; tooling in STORY-010)

**Publishing topology** is locked by [D-16](../decisions/DECISIONS_LOG.md): each capability ships as an independent package (`@starter-saas/auth`, `@starter-saas/rbac`, etc.). Adopters get polyrepo-style independent versioning.

**Development topology** is locked by [D-21](../decisions/DECISIONS_LOG.md): **monorepo with workspaces**. One `khoks/StarterSaaS` repo containing:

```text
StarterSaaS/
├── packages/
│   ├── auth/                # publishes @starter-saas/auth
│   ├── rbac/                # publishes @starter-saas/rbac
│   ├── llm-gateway/         # publishes @starter-saas/llm-gateway
│   ├── brand/               # publishes @starter-saas/brand
│   └── ... (30+ capabilities)
├── apps/
│   └── starter/             # the thin-shell template adopters scaffold
├── tools/                   # build, release, deploy scripts
└── docs/
```

Each `packages/*` has its own `package.json`, version, changelog, semver track. Final package-manager + monorepo-tooling pick (pnpm vs. yarn vs. npm; Turborepo vs. Nx vs. Bazel) deferred to [STORY-010](../../project/stories/STORY-010-tech-stack-decision.md).

Industry-validated by Saleor / Medusa / Strapi / Vercel / Stripe internal / Shopify / Cloudflare / Next.js / Tanstack. Decision can be revisited if/when contributor count and capability ownership warrant per-repo extraction — splitting later is cheap, un-splitting is near-impossible.

---

## White-label mechanism

**Locked 2026-04-28 in [STORY-008](../../project/stories/STORY-008-vision-grooming.md). Logged as [D-20](../decisions/DECISIONS_LOG.md), [D-22](../decisions/DECISIONS_LOG.md), [D-23](../decisions/DECISIONS_LOG.md).**

### Layered: config-driven primary + adapter overrides + plugin extensions

| Layer | Adopters | Covers | Cognitive cost |
|---|---|---|---|
| **1. Config-driven** | ~90% | Brand identity (via `@starter-saas/brand`), enabled subsystems, adapter selections, deploy targets, feature flags | Read one TypeScript file; edit values |
| **2. Adapter overrides** | ~8% | Replace a kit-supplied adapter with a custom one (auth provider, email sender, storage backend) | Implement one interface; register in config |
| **3. Plugin extensions** | ~2% | New behaviors that don't fit existing adapter slots (custom workflow steps, new UI widgets, new AI agent skills) | Plugin manifest + extension-point handlers |

Each layer is the escape hatch for the previous one. Standard for best-in-class OSS (Strapi, Saleor, Next-auth all layer config + adapter + plugin).

**Code-gen is explicitly rejected** as a customization mechanism. Used only for the initial scaffolding step (`npx create-starter-saas my-app`) which produces a minimal thin shell — not a customization vector. Code-gen as a customization mechanism would break [D-16](../decisions/DECISIONS_LOG.md) (subscribe-to-upstream) and [D-17](../decisions/DECISIONS_LOG.md) (AI-assisted merge) — once generated, no upstream to subscribe to.

### Config entry point: `starter.config.ts`

TypeScript with full type definitions for every config key — engineer gets autocomplete + errors-at-edit-time. Configures: brand, enabled layers, adapter picks, deploy targets, feature flags, and (post-MVP-1) plugin manifest declarations.

### Day-1 demo flow

1. `npx create-starter-saas my-app` (scaffolds thin shell)
2. *AI-assisted config generation (D-22)* OR manual edit of `starter.config.ts`
3. Edit `@starter-saas/brand` overrides (logo, colors)
4. Run deploy script
5. Working white-labeled SaaS in ~5 minutes (with AI-assisted config gen) or ~30 (manual)

### AI-assisted config generation (D-22, MVP-1)

First engineer describes the SaaS in natural language; AI Subsystem 5 (lite, MVP-1 subset) generates `starter.config.ts` + suggests adapter picks + scaffolds folder layout. Trust-but-verify: engineer reviews + corrects before applying. Full novelty analysis in [`NOVEL_IDEAS.md`](NOVEL_IDEAS.md). Pulls AI-first credibility into the first interaction with the kit.

### AI-validated plugin compatibility (D-23, MVP-1)

When the engineer authors a plugin against extension points, AI Subsystem 5 simulates upcoming kit upgrades against the plugin's hook signatures and surfaces likely breakage before the upstream merge lands. Same agent as [D-17](../decisions/DECISIONS_LOG.md) (AI-assisted shell merge), different surface. Removes the "plugin maintenance tax" that has historically choked plugin ecosystems. Implies plugin extension-points must be machine-readable. Full novelty analysis in [`NOVEL_IDEAS.md`](NOVEL_IDEAS.md).

### Plugin API stability

Plugins ride a separate semver track from the kit. Breaking changes to extension points get a major plugin-API version bump. STORY-009 will design the ADR covering: extension-point machine-readable spec, plugin manifest format, plugin loading + isolation model, security model.

### Admin UI for non-engineer config edits — v1+ adapter

Out of scope for MVP-1. A future ADAPTER could surface an admin UI for non-engineer config edits (white-label agencies, content teams). NOT a primary mechanism, NOT a replacement for `starter.config.ts`. Filed for v1 in [`RECOMMENDED_ADDITIONS.md`](RECOMMENDED_ADDITIONS.md).

---

## MVP-1 features (TBD in STORY-012)

Plan recommendation (not yet locked): **auth + RBAC + multi-tenant DB + API gateway + notifications (email + in-app) + observability (logs + metrics + traces)**. Locked during STORY-012.

| # | Feature | Subsystem | Why MVP-1 |
|---|---|---|---|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## v1 features

(Populated after MVP-1 lands and feedback rolls in.)

## v2 features

(Populated after v1 lands.)

## v3 features

(Populated when v2 stabilizes.)

---

## Out-of-scope explicitly

(Populated to prevent feature creep — list things that are NOT going to be built, so future contributors don't re-propose them.)
