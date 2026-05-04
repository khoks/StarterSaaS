# ADR-0002 — Tech stack lockdown for MVP-1

- **Status:** accepted
- **Date:** 2026-05-02
- **Deciders:** Rahul Singh Khokhar (project owner)
- **Supersedes:** (none)
- **Superseded by:** (none)

---

## Context

This ADR closes [STORY-010](../../project/stories/STORY-010-tech-stack-decision.md) and locks the tech stack for MVP-1 across four axes: language + framework + runtime, frontend, infrastructure (package manager / monorepo / data layer / tenancy), and AI stack. It synthesizes 13 decision rows (D-24 through D-38, plus the cross-cutting D-21 monorepo direction from STORY-008) into one accepted architectural document.

The stack must serve four locked constraints from prior decisions:

1. **D-13 (founder's first engineer)** — the first technical hire at a 1-5 person company. Adoption is deliberate; demo-to-founder time is a critical metric. Knows TypeScript by default; multi-language onboarding is a tax.
2. **D-15 (AI-first positioning)** — five named AI subsystems anchor the headline pitch. Stack must have first-class AI library support.
3. **D-16 (subscribe-to-upstream + thin-shell + packages)** — kit ships as versioned packages; user repo is a thin shell.
4. **D-21 (monorepo with workspaces)** — kit dev lives in one repo with `packages/<capability>/` workspaces.

## Decision

### Backend (D-24)

- **TypeScript + Node.js + Fastify**, modular monolith for MVP-1 (each subsystem is a workspace package within the monorepo).
- **Node.js for both production and local dev.** Bun excluded for now; revisit at v1+ when production maturity is clearer.
- MVP-1 ships **pure TypeScript** — no Go, Rust, or Python in the codebase.

### Coding standards (D-25)

- `"strict": true` in every package's `tsconfig.json`. No `any` without `// reason: ...`. Prefer `unknown` over `any` at boundaries.
- **Zod schemas on every public boundary**: HTTP route inputs/outputs (Fastify-Zod or equivalent), plugin extension-point signatures, event-bus message schemas, adapter interface contracts, `starter.config.ts` schema, AI agent input/output contracts.
- Internal-only code keeps structural TS types without Zod (Zod has runtime cost; only validate at trust boundaries).
- No `enum`s — string-literal unions or `as const` objects.
- `import type` for type-only imports; tree-shakable side-effect-free imports.
- No barrel files in package public exports beyond a single `index.ts`.

### Polyglot escape-hatch rule (D-26)

A subsystem earns extraction to Go / Rust / other only with **all three** conditions:

1. Measurable **>10× performance benefit** for the subsystem's hot path
2. **Clear contract boundary** with TS callers (gRPC / HTTP / queue / FFI with stable schema)
3. **Maintainer commitment to bilingual onboarding** for that subsystem

MVP-1 stays pure TS regardless. Extractions in v1+ are documented case-by-case in their own ADRs.

### Frontend frameworks (D-27)

- **`apps/starter/`** uses **Next.js App Router**. RSC enforced default; SPA mode is a documented opt-in.
- **`packages/marketing-template/`** uses **Astro** — best static / SEO / partial-hydration story; multi-framework support (HTML / React / Vue / Svelte) for non-engineer content editors.
- **`packages/ui/`** ships **framework-agnostic React** components — no Next-specific imports. Adapters for Remix / Vite SPA / Astro islands land in v1+.

### Frontend supporting libs (D-28)

- **State:** Zustand for client-side; React Server Components handle server-state without TanStack Query in MVP-1.
- **Components:** shadcn-ui pattern (Radix UI primitives + copy-paste customizable styles), themed via `@starter-saas/brand`.
- **CSS:** Tailwind (v4 if mature, v3 fallback), themed via brand package.
- **Forms:** react-hook-form + Zod (consistent with D-25 boundary discipline).

### `packages/ai-ui` (D-29) ships MVP-1

React primitives anchoring the AI-first UI claim:

- streaming-message
- agent-step (visualizes multi-step agent reasoning)
- token-counter
- RAG-source-citation
- prompt-input (with attachment support)
- tool-call-card (renders tool calls + their results)

Framework-agnostic React; usable in Next App Router, Remix, Astro islands, Vite SPA. Themed via brand package.

### i18n (D-30)

- **Deferred to v1+.** MVP-1 ships **English only**.
- v1 lands `next-intl` for Next App Router + `astro-i18n` for marketing-template, coordinated via `@starter-saas/i18n` package.

### Package manager + monorepo tooling (D-31)

- **npm + npm workspaces + Turborepo.**
- npm chosen over pnpm for **zero-install ergonomics** — Node ships npm; contributors and adopters skip the `npm i -g pnpm` step.
- Turborepo orchestrates tasks + caching. Officially supports npm workspaces.
- Tradeoff accepted: npm has looser dependency discipline than pnpm. Mitigation: D-25 (TS strict + Zod) + CI guards. Revisit pnpm at v1+ if phantom-dep issues materialize.

### Data layer (D-32, D-33)

- **ORM:** Drizzle. **Migration tool:** drizzle-kit.
- **Primary DB engine:** PostgreSQL. MySQL / SQLite adapters slated v1+ if user demand exists.
- **Connection pooling:** PgBouncer adapter for production; native node-postgres pool for local dev.
- **Multi-tenancy isolation:** **schema-per-tenant** in PostgreSQL. Each adopter's tenants get their own Postgres schema; kit-supplied tables (auth / RBAC / etc.) instantiated per schema. Cross-tenant queries via dedicated "platform" schemas with schema-qualified queries. **ADR-0004 (multi-tenancy)** in STORY-009 will design the per-schema migration runner + cross-schema query primitives + tenant-provisioning flow.

### AI stack (D-34, D-35, D-36, D-37, D-38)

**LLM provider adapters in MVP-1:**

- Anthropic (Claude family)
- OpenAI (GPT family)
- Ollama (local LLMs for dev / on-prem / regulated industries)

v1+ adapter slate: AWS Bedrock, Google Vertex, Azure OpenAI, Together / Replicate / OpenRouter.

**Kit-default model for AI-assistance features** (D-17 AI-assisted upstream merge, D-22 AI-assisted config gen, D-23 AI-validated plugin compat):

- **Claude Opus 4.7.** Highest reasoning quality currently available; the AI-first claim demands premium AI quality on the kit's own AI features.
- Cost premium (~5× Sonnet) is partially offset by **D-38 prompt caching** on repeated kit context. Adopters override via `starter.config.ts`.

**Embedding model adapters in MVP-1:**

- OpenAI text-embedding-3-small (default)
- Voyage AI (Anthropic-recommended for retrieval)
- Ollama-hosted model (BGE / E5 / nomic-embed-text — privacy / on-prem)

**Vector DB:**

- **pgvector** (lives in the same PostgreSQL instance as D-32 — zero additional deploy at MVP-1 scale; native fit for D-33 schema-per-tenant).
- v1+ adapter slate: Qdrant, Pinecone, Weaviate.

**AI observability + cost management (MVP-1, not deferred):**

- **Cost dashboards** — per-provider / per-tenant / per-feature LLM spend visibility.
- **Per-tenant LLM budget** with hard / soft limits.
- **Anthropic prompt caching** — leveraged transparently when active provider supports it.
- **Adopter-config-driven routing** — `starter.config.ts` declares fallback chains (e.g., "prefer Haiku, fallback to GPT-4o-mini if rate-limited").

## Considered alternatives

### Backend

- **Go primary** — rejected: D-13 first-engineer fit (most don't know Go); AI ecosystem weaker than TS at this writing; no shared language with frontend.
- **Rust primary** — rejected: steep learning curve, smaller talent pool, AI ecosystem nascent.
- **Polyglot from day 1** (Go + TS + Python mix) — rejected: heavy at our scale; D-26 rule defers polyglot to v1+ with clear gates.
- **Bun runtime for production** — deferred: production maturity not yet sufficient at MVP-1 scope. Revisit v1+.

### Frontend

- **Next.js everywhere (including marketing)** — rejected: loses Astro's SEO edge and forces non-engineer content editors into React.
- **Remix or TanStack Start** for `apps/starter/` — rejected: smaller pool than Next; Vercel ai-sdk content + RSC streaming demos are Next-first.
- **Next-locked UI components** — rejected: forces adopters to use Next; breaks D-16 framework-portability promise.

### Package manager

- **pnpm** — rejected for MVP-1 in favor of npm's zero-install ergonomics. Strict-by-default semantics tempting; revisit at v1+ if phantom-dep issues materialize.
- **yarn 4** — rejected: less common in modern OSS-kit ecosystem.

### ORM

- **Prisma** — rejected: custom DSL is less AI-introspectable (matters for D-17 / D-23); Rust engine adds runtime weight; historical edge-runtime issues.
- **Kysely** (thin query builder) — rejected: no schema layer; loses adapter-readable schema property.
- **Native postgres-js + sql template strings** — rejected: type safety opt-in only.

### Vector DB

- **Pinecone primary** — rejected: vendor coupling; managed-only; the pgvector + Postgres-already-here story wins for D-13 first-engineer demo flow.
- **Qdrant / Weaviate primary** — rejected: separate deploy adds operational complexity for MVP-1.

### Tenancy

- **Shared-DB-with-tenant-id** — rejected by user: security audit story is weaker; ergonomics push concerns into application code.
- **DB-per-tenant** — rejected: too heavy operationally for D-13 persona.

### Kit-default AI model

- **Claude Sonnet 4.6** — assistant-recommended. User overrode in favor of Opus 4.7 (higher quality at higher cost). Recorded as D-35 deliberate trade.
- **GPT-4o or o-series as kit-default** — viable alternative; rejected to match the AI-first kit's positioning with the highest-quality reasoning model.

## Consequences

### Positive

- **Single-language stack** for kit dev and adopter shells. Same TS expertise covers backend, frontend, scripts, AI agent code.
- **AI-first claim is materially anchored.** `packages/ai-ui` ships visible AI primitives MVP-1; cost dashboards + per-tenant budgets + prompt caching ship MVP-1; LLM Gateway has 3 adapters MVP-1.
- **Zero-additional-deploy at MVP-1** — PostgreSQL holds transactional data + vectors via pgvector; Ollama is opt-in local-only; one Postgres instance covers D-32 + D-33 + D-37.
- **Strong tenant isolation** via schema-per-tenant for security audit stories.
- **npm + Turborepo** = zero-install onboarding ergonomics; first contributor sees `git clone && npm install && npm run dev`.
- **Adapter-everywhere pattern** preserves D-16: every concrete pick (LLM provider / embedding model / vector DB / DB engine / cloud / etc.) is an adapter slot adopters can override.

### Negative / accepted tradeoffs

- **npm has looser dependency discipline than pnpm.** Phantom-dep risk; mitigated by D-25 + CI guards. Revisit at v1+ if issues materialize.
- **Drizzle has lower mainstream familiarity than Prisma** for first engineers reflexively reaching for Prisma. Mitigated by adapter pattern (adopters can swap to Prisma); offset by Drizzle's AI-introspectability advantages for D-17 / D-23.
- **Schema-per-tenant complicates migrations** (must run against N schemas). Addressed in ADR-0004 with a per-schema migration runner.
- **Opus 4.7 default for kit AI features is more expensive** than Sonnet alternatives. Accepted as a deliberate quality bet for AI-first positioning; partially offset by prompt caching.
- **Anthropic + OpenAI dual-provider dependency** at MVP-1 means kit adopters need accounts at both (or Ollama for local-only). Mitigation: any one of the three is sufficient for a basic deploy via adapter selection in `starter.config.ts`.
- **Bun excluded for production** trades faster runtime for proven maturity. Revisit at v1+.

### Cross-cutting (deferred to STORY-009)

The following ADRs in STORY-009 will reference and extend this lockdown:

- **ADR-0004** — Multi-tenancy detail: per-schema migration runner, cross-schema query primitives, tenant-provisioning flow (extends D-33).
- **ADR-0005** — Event bus: pattern, schema discipline, choice of mechanism (Postgres NOTIFY / Redis Streams / Kafka adapters).
- **ADR-0006** — Observability: OpenTelemetry + backend default + LLM-trace-aware extension (extends D-38 cost dashboards).
- **ADR-0007** — Auth provider strategy: self-hosted (Auth.js / Authelia / Ory) vs. third-party adapter (Auth0 / Clerk).
- **ADR-0008** through ADR-0012 — One ADR per AI subsystem (D-15 Sub 1-5).
- **ADR-0013** — Plugin extension-point spec + AI-validated compat methodology (extends D-23).
- **ADR-0014** — AI-assisted upstream merge mechanism (extends D-17).

## Implementation notes

- `tsconfig.base.json` at repo root will set `"strict": true` and other shared compiler options; per-package `tsconfig.json` extends it.
- ESLint + Prettier specifics finalized when the first source file lands (Phase D, deferred from STORY-010 closure).
- Turborepo `turbo.json` will declare `build`, `lint`, `test`, `dev`, `release` pipelines spanning the workspace tree.
- Each `packages/*` declares its own `package.json` with semver-driven independent versioning. Changesets (or equivalent) for release management.
- Package public exports limited to `index.ts` per package; no deep imports allowed for adopters.
- AI provider SDKs (`@anthropic-ai/sdk`, `openai`, ollama client) live in `packages/llm-gateway`; adopters never import them directly.

## Revisit triggers

- **pnpm reconsidered** — phantom-dep issue in CI; OR pnpm install time becomes a contributor friction point.
- **Bun reconsidered for production** — Node performance becomes a measurable bottleneck at adopter scale AND Bun production maturity is established.
- **Polyglot extraction proposed** — any subsystem proposes Go/Rust extraction per D-26 rule; new ADR per extraction.
- **Vector DB adapter swap** — pgvector hits scale ceiling; first adopter requests Qdrant / Pinecone adapter.
- **Kit-default AI model swap** — cost or quality concerns; adopter feedback that Opus 4.7 is overkill / underpowered for typical kit AI-assistance flows.
- **Tenancy model revisit** — schema-per-tenant scaling challenges (e.g., N > 1000 tenants where per-schema overhead becomes costly); ADR-0004 will define the threshold.
