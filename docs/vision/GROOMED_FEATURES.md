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

## Differentiator (TBD in STORY-008)

What's the one-sentence reason a founder picks StarterSaaS over assembling Supabase + Stripe + Auth0 + Posthog themselves?

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
