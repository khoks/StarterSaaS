# CLAUDE.md — Project context for Claude Code sessions

> **Phase: B — Grooming (active since 2026-04-27).** No product code yet. Cloud target and MVP-1 surface still pending. **STORY-008 + STORY-010 done** (27 decisions D-12..D-38; ADR-0002 accepted — full TS stack: Node + Fastify + Next + Astro + npm + Turborepo + Drizzle + Postgres + schema-per-tenant + pgvector + Anthropic + OpenAI + Ollama; Opus 4.7 kit-default for AI-assistance). **STORY-011 in progress** (cloud target — AWS / GCP / both).

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
- Direct push to `main` once branch protection is enabled (use the PR workflow / `auto-pr` skill)
- Run `pnpm install`, `npm install`, `pip install`, etc. before Phase B locks the stack
- Install Docker images or run docker-compose before Phase B
- Use `--privileged` on any Docker invocation, ever
- Commit with `--no-verify` or any hook bypass

---

## When in doubt

1. Re-read this file.
2. Check [`project/BOARD.md`](./project/BOARD.md) for current state.
3. Check the relevant ADR.
4. Ask the user.
