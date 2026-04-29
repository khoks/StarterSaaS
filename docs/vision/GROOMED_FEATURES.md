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

## Kit-promise model (TBD in STORY-008)

Fork-once-and-modify, subscribe-to-upstream, or hybrid? This determines how breaking changes propagate.

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
