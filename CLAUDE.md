# CLAUDE.md — Project context for Claude Code sessions

> **Phase: D — MVP-1 build (started 2026-05-07).** Phase A + B + C done. **STORY-032 + STORY-013 + STORY-014 done.** **STORY-015 in progress** — **sub-PR #1 in flight** ships `@starter-saas/cli` skeleton (commander-based tenant-command tree per D-42) + `@starter-saas/tenancy/testing` sub-path export with PGlite-backed integration test harness (PGlite over testcontainers — no Docker dep, ~50ms boot, real Postgres SQL via WASM). **130 tests green** across auth + event-bus + saga + tenancy + cli. **OAuth deferred** (waits for apps/starter HTTP layer). Phase D Story queue continues: STORY-015 sub-PRs #2 (migration runner) → #3 (archival) → #4 (RBAC + middleware) close EPIC-003; then EPIC-004 → EPIC-005 → EPIC-006 → EPIC-007 → EPIC-008. **All PRs admin-merged per D-57**.

This file is the entry point for any Claude Code session working in this repo. Read it first. Read [`project/BOARD.md`](./project/BOARD.md) second.

---

## Mission (one paragraph)

StarterSaaS is an **AI-first, production-grade, white-label SaaS starter kit** any founder can clone, white-label, and run a one-shot deploy script against AWS or GCP — bringing up a working multi-cloud SaaS end-to-end. It integrates **30+ layers every modern SaaS provider re-builds from scratch** — auth, RBAC, gateway, API marketplace, app-developer portal, multi-tenant data stores, CRM, subscriptions/tiering, notifications (email/SMS/push/WhatsApp), event bus + saga choreography, conversational support agent, campaigns, upsell/recommendation models, observability (logs/metrics/traces, paging, ticketing), feedback, customer-care chatbot, analytics platform, ETL, pre-auth marketing site, post-auth in-app help, per-capability data stores, data-quality plumbing — and **five AI subsystems** anchoring the AI-first claim: (1) event-driven Customer Profile Builder + AI-native stores, (2) Context-Resolving Query Service for AI and non-AI clients, (3) Agent Platform + Omnichannel Orchestrator with 6 registries, (4) LLM Gateway + Safety + Model Hub + Eval/Feedback + Cost (foundational; MVP-1), and (5) AI Coworker Platform for Internal Ops. Everything sits behind clean adapter interfaces so every concrete implementation is swappable.

**Headline pitch (D-15):** *"AI-first, production-grade SaaS platform — 30+ integrated layers you will eventually need, white-labelable, one-command deployable."*

**Thesis:** founders should compete on their actual product, not on rebuilding the layers underneath.

---

## Decisions locked

| # | Decision | Choice | Reason |
|---|---|---|---|
| D-1 | Repo location | `D:/DEV/ClaudeProjects/StarterSaaS` | Sibling repo; independent of LearnPro |
| D-2 | Project name | `StarterSaaS` | User-confirmed |
| D-3 | License | **MIT** | Maximum permissiveness for white-label adoption — see [`docs/architecture/ADR-0001-license-mit.md`](./docs/architecture/ADR-0001-license-mit.md) |
| D-4 | Default branch | `main` | GitHub default; PR-protected after Phase A |
| D-5 | GitHub remote | Private repo at [`khoks/StarterSaaS`](https://github.com/khoks/StarterSaaS) | Visibility flips to public when MVP-1 ships |
| D-6 | Skill set | `harvest-knowledge` + `work-tracking` (adapted from LearnPro) + new `auto-pr` | Three-skill chain in Stop hook |
| D-7 | Auto-PR model | Branch-per-session → push → `gh pr create` → `gh pr merge --auto --squash` | Keeps `main` always-green; PR queue is the audit trail |
| D-8 | Collaboration cadence | Heavy upfront PM + engineer discussion **before** any code; auto-merge **after** agreement | User explicitly requested this guardrail |
| D-9 | MVP-1 shape | Thin vertical slice end-to-end (~6 subsystems) — exact 6 chosen during grooming | Avoids broad-but-shallow stub-everything trap |
| D-10 | Bootstrap commit | First commit lands directly on `main` (no PR) | The bootstrap *is* the PR-able infrastructure; can't PR before it exists |
| D-11 | RAW vision capture | User's voice-transcribed brain-dump goes verbatim into `docs/vision/RAW_VISION.md` | Source-of-truth for *intent*; transcription artifacts noted separately |
| D-24 | Backend stack | **TypeScript + Node.js + Fastify** on a modular monolith (workspace packages within the monorepo); polyglot allowed v1+ per D-26 | Best fit for D-13 (TS is universal) + D-15 (best AI SDK ecosystem) + D-16 (npm maturity) + D-21 (monorepo tooling) + D-23 (structural types for plugin compat). Bun excluded for now — re-evaluate v1+ |
| D-25 | Coding standard | **TS strict mode + Zod schemas on every public boundary** (HTTP routes / plugin extension points / event-bus messages / adapter interfaces / config schema / AI agent I/O). Internal code keeps TS-only types | Backbone of D-23 AI-validated plugin compat — agents reason about machine-readable shapes. Industry-validated by tRPC, Hono, Fastify-Zod, Effect Schema |
| D-26 | Polyglot rule | Subsystem extracts to Go/Rust only with ALL THREE: ≥10× perf benefit + clear contract boundary (gRPC/HTTP/queue) + bilingual maintainer commitment. MVP-1 stays pure TS | Without a written rule, polyglot creep produces worst-of-all-worlds. 10× threshold is high on purpose; small wins don't justify operational tax |
| D-27 | Frontend frameworks | **Next.js App Router** for `apps/starter/`; **Astro** for `packages/marketing-template/`; **framework-agnostic React** for `packages/ui/`; RSC enforced default + SPA opt-in | D-13 fit (Next is what first engineers know); D-15 fit (Vercel ai-sdk Next-first); D-18 fit (Astro best for marketing SEO + non-engineer editors); D-16 fit (UI components stay framework-portable for v1+ adapters) |
| D-28 | Frontend supporting libs | **Zustand** + **shadcn-ui pattern** + **Tailwind** + **react-hook-form + Zod** | Industry defaults for the persona; shadcn-ui pattern preserves D-16 (adopters own code); Zod usage feeds D-25 boundary discipline |
| D-29 | `packages/ai-ui` | Ships **MVP-1**: streaming-message / agent-step / token-counter / RAG-source-citation / prompt-input / tool-call-card React primitives | AI-first claim (D-15) needs visible AI UI primitives at MVP-1 — otherwise the differentiator is hollow at first contact |
| D-30 | i18n scope | **v1+** (MVP-1 English only); v1 lands `next-intl` + `astro-i18n` adapters in `@starter-saas/i18n` | Keeps MVP-1 tight; matches Vercel / Next-auth / Stripe English-first pattern; D-13 persona is US-centric |
| D-31 | Package mgr + monorepo tooling | **npm + npm workspaces + Turborepo** | Zero-install ergonomics (Node ships npm). pnpm's strict semantics revisit-able v1+ if phantom-dep issues surface |
| D-32 | Data layer | **Drizzle ORM + drizzle-kit + PostgreSQL primary**; **PgBouncer prod / native pool dev** | TS-first schema-as-data compounds with D-15 / D-23. Native pgvector. Lightweight runtime preserves D-26 polyglot option |
| D-33 | Multi-tenancy | **Schema-per-tenant** in Postgres. Pre-locked here; full ADR-0004 in STORY-009 | Strong isolation; native Postgres ops fit; better than shared-DB-with-tenant-id for D-13 persona's security audit story |
| D-34..D-38 | AI stack | **Anthropic + OpenAI + Ollama** providers MVP-1; **Claude Opus 4.7** as kit-default for AI-assistance features (D-17 / D-22 / D-23); **OpenAI text-embedding-3-small + Voyage + Ollama** embeddings; **pgvector** primary; **cost dashboards + per-tenant budget + prompt caching + adopter-config routing** all MVP-1 | Anchors AI-first claim with visible MVP-1 features; Opus 4.7 chosen by user over Sonnet 4.6 — quality over cost for the kit's first impression; pgvector zero-additional-deploy. Full rationale in [ADR-0002](./docs/architecture/ADR-0002-tech-stack.md) |
| D-39..D-41 | Cloud + IaC | **Both AWS + GCP from MVP-1** (D-39, honors D-15 headline pitch); **Pulumi (TypeScript)** as IaC (D-40, TS-native + AI-introspectable); module structure `packages/infra-{shared,aws,gcp}/`; default regions us-west-2 (AWS) / us-west1 (GCP) prompted; managed Postgres MVP-1; self-hosted Ollama VPC pod opt-in; one-cloud-per-deploy MVP-1 (D-41) | One-command deploy to AWS or GCP requires both adapters at MVP-1; ~150% scope on infra accepted to honor headline pitch. Pulumi TS unifies stack with D-24. Full rationale in [ADR-0003](./docs/architecture/ADR-0003-cloud-target.md) |
| D-42..D-43 | Deploy CLI + portal | **`@starter-saas/cli`** TS tool (D-42) with subcommands `init` / `deploy` / `tenant` / `teardown` / `doctor`; 10-step idempotent flow; AI-assisted opt-in; telemetry opt-in default-OFF; triple-confirm teardown; default 30min timeout. **Deploy command portal** (D-43, MVP-1) — local web/TUI dashboard during deploy with real-time step status + pause/resume/abort + AI-narrated progress | TS CLI matches D-24 stack; portal eliminates "trust the timeout" UX, gives adopter real-time visibility + control. User-proposed; medium-novelty NOVEL_IDEAS entry |
| D-44 | Multi-tenancy detail | **Per-schema migration runner** in `tenant migrate` (default 5 parallel + continue-on-error); **cross-schema query primitives** (`platform` schemas + `withTenants()` wrapper); **PgBouncer transaction mode + per-tenant 100 q/s rate-limit middleware**; **9-step idempotent + compensating provisioning saga**; **2-stage archival** (soft + 30-day hard delete) with `legal_hold` flag for GDPR | Provisioning saga is the kit's first concrete saga — drives ADR-0005 event-bus requirements. Full design in [ADR-0004](./docs/architecture/ADR-0004-multi-tenancy.md) |
| D-45 | Event bus + saga | **Kafka-shaped contract surface from day 1**; MVP-1 = `@starter-saas/event-bus-pg-outbox` (Kafka semantics over Postgres NOTIFY + outbox); **v1 target = native Kafka adapter** (drop-in swap; adopter code unchanged). Saga choreography = event-driven, TS-coded state machines, instance tracking in `platform.saga_instances`, compensating actions registered per step | User-driven discipline: Kafka is end-state; outbox is MVP-1 stand-in, not separate paradigm. Full design in [ADR-0005](./docs/architecture/ADR-0005-event-bus.md) |
| D-46 | Observability | **OTel SDK + GenAI semconv** foundation; **cloud-native + Langfuse MVP-1** backends (Langfuse = LLM-specific deep-dive — agent flows, LangGraph, eval); v1+ adapters Grafana stack / Datadog / New Relic / Honeycomb; cost dashboard MVP-1 + per-tenant budget enforcement MVP-1; PII scrubbing required by default; adaptive sampling 1% healthy / 100% errors | Two-headed observability for LLM calls (OTel general + Langfuse LLM-specific); cloud-native default honors D-13 zero-additional-deploy. Full design in [ADR-0006](./docs/architecture/ADR-0006-observability.md) |
| D-47 | LLM Gateway | **Gateway = policy enforcement + observability choke point, NOT a routing brain.** Provider/model selection per-component (each feature declares its preferred provider + model); Gateway applies cross-cutting policy: Safety (PII/PCI/profanity/illegal/injection/bias filters), Model Hub (provider registry + adopter-hosted models + provisioned-throughput v1+), Eval/Cost (eval framework hooks + per-call cost + per-tenant budgets), and emits OTel + Langfuse + cost-event-on-bus. **Refines D-35 + D-38** as feature-level config, not Gateway-global | User-driven refinement: per-component selection lets each feature optimize cost/quality/latency for its task; Gateway-as-policy-point matches industry pattern (Cloudflare Workers AI Gateway, AWS Bedrock guardrails). Full design in [ADR-0011](./docs/architecture/ADR-0011-llm-gateway.md) |
| D-48 | Auth provider | **Auth.js (v5+) MVP-1 default** with Drizzle adapter; auth tables in `platform.{users,sessions,accounts,verification_tokens}`; tenant-aware via `platform.user_tenant`; flows MVP-1 = email+pwd / magic link / OAuth (Google/GitHub/Apple) / TOTP 2FA; v1+ adapters Clerk / Auth0 / Cognito / GCP Identity Platform / WorkOS / Authelia / Ory Kratos; RBAC sketch (per-tenant `tenant_xyz.{roles,user_roles}`, full RBAC ADR deferred) | Auth.js is reflexive choice for first engineers in 2026; D-27 + D-32 + D-33 fit. Full design in [ADR-0007](./docs/architecture/ADR-0007-auth-provider.md) |
| D-49 | Status / brand / admin UI | **Status page MVP-1**: built-in lightweight self-hosted (auto-updated from D-46 incidents) + Instatus managed adapter. **Brand package** `@starter-saas/brand` MVP-1 with logo+colors+typography+copy+OG-images; Tailwind tokens; adopter customization via fork or `starter.config.ts` overrides or `mode: "raw"` opt-out. **Admin UI adapter contract MVP-1** (no impl until v1+): defines surfaces for branding/flags/tenants/RBAC/observability; engineer-only config NEVER in admin UI; always `platform_admin` RBAC-gated | Built-in status covers D-19 zero-deploy story; Instatus serves managed adopters. Brand-as-package preserves D-18 + D-16. Admin UI contract MVP-1 prevents v1+ contract churn. Full design in [ADR-0017](./docs/architecture/ADR-0017-status-brand-admin.md) |
| D-50..D-53 | 4 AI subsystems | **Sub 1 Customer Profile Builder** (D-50, ADR-0008): foundation MVP-1, subsystem v1; event-bus consumer + 5 default profile types in pgvector + adopter extensibility. **Sub 2 Context-Resolving Query Service** (D-51, ADR-0009): v1; 3-layer plan/execute/synthesize pipeline; permission filter at execute. **Sub 3 Agent Platform** (D-52, ADR-0010): MVP-1 web + 4 of 6 registries + LangGraph orchestrator; v1 subagents + mobile + non-UI embed; v1+ telephonic. **Sub 5 AI Coworker Internal Ops** (D-53, ADR-0012): MVP-1 lite via D-17/D-22/D-23 + architecture registry foundation; v2 full (conversational + workflows + scheduled). All depend on D-47 LLM Gateway | All four subsystems flow data from event bus (D-45) → AI-native stores → Context Query → agents/coworkers. Phase fits keep MVP-1 scope manageable while ensuring foundations ready for v1 subsystems. Full designs in [ADR-0008](./docs/architecture/ADR-0008-customer-profile-builder.md) / [ADR-0009](./docs/architecture/ADR-0009-context-resolving-query.md) / [ADR-0010](./docs/architecture/ADR-0010-agent-platform.md) / [ADR-0012](./docs/architecture/ADR-0012-ai-coworker-internal-ops.md) |
| D-54..D-55 | ML platform + data quality | **D-54 ML platform**: pluggable adapter pattern; LLM Gateway is the ONLY AI infrastructure MVP-1; SageMaker / Vertex AI / MLflow / Weights & Biases adapters slated v1+. **D-55 data quality**: Zod schemas (D-25) ARE the contract-based foundation MVP-1; Great Expectations / Soda / custom adapters v1+ for declarative-rules / data-at-rest checks | Most D-13 adopters at MVP-1 don't need traditional ML; pluggable v1+ keeps MVP-1 scope. Zod-everywhere already covers contract-level data quality; richer rules adapter v1+ for adopters who outgrow Zod-only. STORY-009 cross-cutting closeouts |
| ADRs 0013-0018 | 5 cross-cutting + AI mechanism ADRs | **ADR-0013** plugin spec + AI-validated compat methodology (extends D-23). **ADR-0014** AI-assisted upstream merge mechanism (extends D-17) — adapter usage signatures + test-first verification + confidence scoring + autonomous-mode toggle v1. **ADR-0015** AI-assisted config generation mechanism (extends D-22) — NL → Zod-validated pipeline with repair-and-retry + adapter verification + iteration loop. **ADR-0016** AI-streaming UI primitives integration (extends D-29) — SSE primary + WCAG 2.1 AA floor + component-orchestrator decoupling. **ADR-0018** deploy portal mechanism (extends D-43) — port allocation + resource-boundary pause/resume + AI narration with prompt caching + headless mode | All extend earlier MVP-1 commitments with implementation detail. Architecture registry from ADR-0012 is foundational to ADRs 0013/0014/0015. Full designs in respective ADR files |
| D-56 | MVP-1 surface | **19 capabilities organized as 6 thematic Epics**: EPIC-003 Identity + Tenancy / EPIC-004 Communication Plumbing / EPIC-005 Observability + AI Cost / EPIC-006 AI Foundation / EPIC-007 AI-First Features / EPIC-008 UX + Deploy. Foundation-only for AI Sub 1 + Sub 2 (full subsystems v1). ~30 deferrals to v1 / v1+ / v2 explicitly listed | The original "~6 subsystems" plan was insufficient against the AI-first vision (D-15) which expanded the candidate set to 18+; thematic clustering matches the original AC count while honoring the breadth. Full surface in [`docs/roadmap/MVP.md`](./docs/roadmap/MVP.md) |
| D-57 | Admin-merge authorization | **Admin-merge expanded to ALL PRs** (including source-code), superseding D-14's doc-only scope. Safety guardrails preserved: never `--no-verify`, never `--no-gpg-sign`, never force-push to `main`, never push direct to `main`, never skip CI failures. Assistant self-reviews every PR before admin-merge | User-authorized 2026-05-07 to unblock Phase D pacing. Trust delegation justified by Phase B track record (45 decisions, careful documentation). Audit trail preserved via PR history + DECISIONS_LOG + commit messages |
| Cloud target | TBD | Locked during Phase B (STORY-011) |
| Multi-tenancy model | TBD | Locked during Phase B (STORY-009) |

---

## Where to find things

- **The user's original vision** (verbatim, untouched): [`docs/vision/RAW_VISION.md`](./docs/vision/RAW_VISION.md). Source-of-truth for *intent*.
- **Groomed features** (Phase B output, MVP/v1/v2 tagged): [`docs/vision/GROOMED_FEATURES.md`](./docs/vision/GROOMED_FEATURES.md). Currently a stub.
- **Recommended additions** (gaps the user didn't mention but needs): [`docs/vision/RECOMMENDED_ADDITIONS.md`](./docs/vision/RECOMMENDED_ADDITIONS.md). Currently a stub; populated during Phase B.
- **Novel / patentable ideas log**: [`docs/vision/NOVEL_IDEAS.md`](./docs/vision/NOVEL_IDEAS.md). Maintained by `harvest-knowledge`.
- **Architecture & ADRs**: [`docs/architecture/`](./docs/architecture/). Currently only ADR-0001 (license) is locked. ADR-0002+ written during Phase B/C.
- **Decisions log** (lighter than ADRs): [`docs/decisions/DECISIONS_LOG.md`](./docs/decisions/DECISIONS_LOG.md). Maintained by `harvest-knowledge`.
- **MVP scope**: [`docs/roadmap/MVP.md`](./docs/roadmap/MVP.md). Currently a stub; locked in Phase C.
- **Phased roadmap**: [`docs/roadmap/ROADMAP.md`](./docs/roadmap/ROADMAP.md).
- **Live work tracking**: [`project/BOARD.md`](./project/BOARD.md). **Read this every session before starting work.**
- **Product strategy** (Phase B): `docs/product/COMPETITIVE.md`, `docs/product/DIFFERENTIATORS.md`, `docs/product/UX_DETAILS.md`. Not created yet.

---

## Auto-housekeeping at session end

A project-scoped `Stop` hook in [`.claude/settings.json`](./.claude/settings.json) blocks the first stop attempt of each session and reminds Claude to run **three** skills, in order:

1. [**`harvest-knowledge`**](./.claude/skills/harvest-knowledge/SKILL.md) — extracts vision / architecture / decisions / novel-ideas from the conversation and updates the matching docs.
2. [**`work-tracking`**](./.claude/skills/work-tracking/SKILL.md) — sweeps the conversation for new requirements / scope / status changes and updates Epics / Stories / Tasks + `BOARD.md`.
3. [**`auto-pr`**](./.claude/skills/auto-pr/SKILL.md) — branches off `main`, commits the doc/tracking updates, pushes, opens a PR, enables auto-merge.

Once all three have run (or you've explicitly skipped any with a one-line reason), `mkdir -p .claude/state && touch .claude/state/housekept-<session_id>` to release the hook so the session can stop. The hook also no-ops when `stop_hook_active=true` so it can never loop.

If you change `.claude/settings.json` mid-session, open the `/hooks` menu once or restart Claude Code so the watcher picks it up.

---

## The project tracking system is the source of truth

`project/` is a JIRA-style Epic → Story → Task hierarchy stored as markdown files in the repo. **Do not rely on session history to reconstruct what's done or pending.** The board is the source of truth.

Workflow for every session that touches code or scope:

1. Read [`project/BOARD.md`](./project/BOARD.md) — what's `in-progress`, what's `Up Next`?
2. Pick a Story (or get one from the user). Set its `status: in-progress`. Append to its activity log: `YYYY-MM-DD — picked up`. Update `BOARD.md`.
3. Do the work.
4. When complete, set `status: done`. Append: `YYYY-MM-DD — done`. Update `BOARD.md`. Let `auto-pr` land it.
5. New requirement from a discussion? **Create a Story** (or Task under an existing Story). Don't just remember it.
6. Cancelled scope? Set `status: canceled`, add reason to activity log.

Conventions are documented in [`project/README.md`](./project/README.md). Templates are in [`project/TEMPLATES/`](./project/TEMPLATES/).

---

## Coding standards (apply once code lands — Phase D onward)

### Universal rules

- **No premature abstraction.** Three similar lines is better than a generic helper. Don't introduce adapters/interfaces beyond what's documented in the architecture doc.
- **No dead code.** If you remove a feature, delete it. No `// removed` comments, no commented-out blocks.
- **Comments are rare.** Default to none. Write one only when the *why* is non-obvious. Never describe what the code does — names should do that.
- **Validate at boundaries, trust internal code.** No defensive try/catch for impossible cases.
- **No SaaS plumbing in the core kit beyond the layers we're shipping.** Each subsystem has a clear interface; all advanced features hang off optional extension points.

### TypeScript stack rules (locked via D-24, D-25, D-26 — STORY-010 in progress)

- **`"strict": true`** in every package's `tsconfig.json`. No `any` without a `// reason: ...` comment. Prefer `unknown` over `any` at boundaries.
- **Zod schemas on every public boundary**: HTTP route inputs/outputs (Fastify-Zod or equivalent), plugin extension-point signatures, event-bus message schemas, adapter interface contracts, `starter.config.ts` schema, AI agent input/output contracts. Internal-only code keeps structural TS types without Zod (Zod has runtime cost; only validate where data crosses a trust boundary).
- **No `enum`s** — use string-literal unions (`"a" | "b" | "c"`) or `as const` objects. Better tree-shaking, plays well with Zod.
- **`import type`** for type-only imports. Side-effect-free imports must stay tree-shakable.
- **No barrel files in package public exports** beyond a single `index.ts` per package. Adopters import from `@starter-saas/auth`, not `@starter-saas/auth/internal/something`.
- **Polyglot rule (D-26):** non-TS code lives in its own subsystem with a TS-side adapter; never inline. Three required gates per D-26 (10× perf + clear contract + bilingual maintainer).
- ESLint config + Prettier specifics finalized when the first source file lands (Phase D, deferred from STORY-010 closure).

---

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/), with a Story or Task ID at the end:

```
chore(project): bootstrap StarterSaaS scaffolding [STORY-001]
docs(vision): capture raw vision verbatim [STORY-002]
feat(skills): add auto-pr skill with auto-merge [STORY-003]
fix(hook): reorder skill chain [STORY-003]
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `ci`, `build`. Scope is the package or area.

**Always reference the Story (or Task) ID.** If there isn't one, create the Story first.

---

## PR workflow

After Phase A completes (after STORY-006), all changes land via PRs into `main` on [`khoks/StarterSaaS`](https://github.com/khoks/StarterSaaS). Branch protection enforces this (PR required, 0 reviews, linear history, no force-push, no deletion). The assistant is authorized to **self-merge** *after* the design / requirement / algorithm / tech-stack alignment for the work has happened conversationally with the user (D-8).

**Branch naming:**

- Story work: `story/NNN-kebab-slug` — e.g. `story/008-vision-grooming`
- Auto-PR (housekeeping): `auto/<session-id>-<utc-date>` — created by the `auto-pr` skill
- Chore (no Story): `chore/<slug>`
- Fix: `fix/<slug>`

**PR title:** same as commit style — `feat(scope): summary [STORY-NNN]`. Use **squash-merge** (linear history is enforced).

**PR body:** the [template](./.github/PULL_REQUEST_TEMPLATE.md) is auto-applied. Fill in all sections; tick the checklist honestly.

**When to pause and ask before merging:**

- Architectural decisions worthy of an ADR (push to a separate PR; let the user read first)
- New external dependencies, services, or paid integrations
- Anything that meaningfully changes a previously-locked decision in this file or `docs/decisions/`
- Anything the user has explicitly asked to review

---

## Branch protection setup (one-time, manual)

After STORY-006 lands and the GitHub repo exists, the user enables on `main`:

- Require pull request before merging (0 reviews required for solo dev)
- Require status checks to pass: the `ci.yml` workflow's `markdown-lint` job
- Require linear history (squash-merge enforced)
- Allow auto-merge
- Disallow force-push and branch deletion

Without this, `gh pr merge --auto` from the `auto-pr` skill will hard-fail. CLAUDE.md flags this as a Phase A finishing step.

---

## OS notes (Windows-first, but writing for cross-platform)

- Primary dev environment is Windows 11 (with WSL2 for Docker, once the stack lands).
- In code paths and shell commands, **use forward slashes** and POSIX-style paths. Tooling is configured via `.gitattributes` to normalize line endings.
- OS-specific bootstrap and deploy scripts will live under `scripts/{windows,mac,linux}/` (created during Phase D).
- Use bash syntax (not PowerShell) for any shell snippets unless explicitly Windows-only.

---

## Always update an ADR for architectural decisions

If you change the tech stack, swap a library, change a security model, or alter how packages depend on each other — write an ADR in `docs/architecture/`. Format: `ADR-NNNN-short-slug.md`. Status (proposed / accepted / superseded), context, decision, consequences. Keep them short.

---

## The MVP gate

The MVP scope is fixed in [`docs/roadmap/MVP.md`](./docs/roadmap/MVP.md) (currently a stub; locked during Phase C). Anything outside MVP-1:

- Goes into `project/` as a new Story under the relevant Epic, with `status: backlog` and `phase: v1` (or v2/v3).
- Does **not** land in MVP-1 code.

Every "while we're at it…" idea is a chance to bloat the MVP into oblivion. Resist.

---

## Collaboration cadence guardrail (D-8)

The user wants **design / requirements / algorithm / tech-stack discussions to happen BEFORE work begins.** Auto-PR + auto-merge is enabled, but it's a tool for landing already-agreed work — not a substitute for the conversation. Concretely:

- Phase B grooming questions (vision, architecture, stack, cloud, etc.) get asked one at a time with the assistant's recommendation + tradeoffs + a question for the user. The user decides; the assistant logs the decision; only then does work-tracking + auto-PR run.
- For each algorithmic decision (recommendation model, saga choreography, nudge engine, data-quality, etc.), the assistant offers (a) the best-known production approach + tradeoffs, (b) an explicit invitation for the user's own approach, (c) analysis of advantages/disadvantages/novelty if the user proposes one, (d) a `NOVEL_IDEAS.md` entry if warranted.
- The assistant never mass-merges grooming output without first surfacing it conversationally.

---

## Things to never do (without explicit user approval)

- `git push --force` to any branch (linear history enforced; ask first if you genuinely need a force-push elsewhere)
- `git remote add` (origin is `khoks/StarterSaaS`; do not add additional remotes)
- Direct push to `main` (PR workflow stays mandatory even under D-57 admin-merge authorization — go through a branch + PR + `gh pr merge --admin`)
- `gh pr merge --admin` with `--no-verify` or any hook bypass (D-57 expands admin scope but preserves safety guardrails)
- `gh pr merge --admin` while CI checks are failing (investigate the failure, don't override it)
- Install Docker images or run docker-compose without explicit approval
- Use `--privileged` on any Docker invocation, ever
- Commit with `--no-verify` or any hook bypass
- `--no-gpg-sign` to bypass signing if/when signing is required

---

## When in doubt

1. Re-read this file.
2. Check [`project/BOARD.md`](./project/BOARD.md) for current state.
3. Check the relevant ADR.
4. Ask the user.
