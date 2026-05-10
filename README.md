# StarterSaaS

> **AI-first, production-grade SaaS platform — 30+ integrated layers you will eventually need, white-labelable, one-command deployable.**

**Status:** Phase D bootstrap started 2026-05-07. Phase A (bootstrap) + Phase B (grooming) + Phase C (MVP-1 lockdown) all closed. **45 decisions** locked, **18 ADRs accepted**, **MVP-1 surface = 19 capabilities across 6 Epics**, **19 Phase D Stories** drafted. See [`docs/roadmap/MVP.md`](./docs/roadmap/MVP.md).

**Phase plan:**

| Phase | Scope | Status |
|---|---|---|
| **A — Bootstrap** | Repo skeleton + Claude tooling + GitHub remote + MIT license | ✅ done (2026-04-25) |
| **B — Grooming** | Vision, requirements, architecture, tech stack, cloud target — interactive Q&A | ✅ done (2026-05-06) |
| **C — MVP-1 lockdown** | 19 capabilities across 6 Epics; ADRs accepted; Stories decomposed | ✅ done (2026-05-06) |
| **D — MVP-1 build** | Implementation — thin vertical slice, one-command deploy to AWS or GCP | 🟡 in progress (2026-05-07) |

## Monorepo conventions

```text
StarterSaaS/
├── packages/                    # versioned packages — one per kit capability
│   ├── auth/                    # @starter-saas/auth (per ADR-0007 / STORY-013)
│   └── ...                      # ~30 capability packages, added per Story
├── apps/
│   └── starter/                 # @starter-saas/starter — thin-shell adopter template
├── docs/                        # locked decisions, ADRs, vision, MVP roadmap
├── project/                     # JIRA-style tracking (Epics + Stories + Tasks + BOARD)
├── package.json                 # root: npm workspaces + Turborepo orchestration
├── tsconfig.base.json           # TS strict mode + Zod boundary discipline (per D-25)
└── turbo.json                   # build / test / lint / typecheck / dev pipelines
```

**Build commands** (run at repo root):

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies for all workspace packages |
| `npm run build` | Turborepo-orchestrated build across packages (respects dependency graph) |
| `npm run test` | Test suite across packages |
| `npm run typecheck` | TS typecheck across packages |
| `npm run lint` | Lint across packages |
| `npm run dev` | Per-package dev mode (parallel; persistent) |

**Stack** (locked in [ADR-0002](./docs/architecture/ADR-0002-tech-stack.md)):

- **TypeScript + Node.js + Fastify** (strict mode + Zod schemas on every boundary)
- **Next.js App Router** (`apps/starter`) + **Astro** (`packages/marketing-template`) + framework-agnostic React (`packages/ui`)
- **Drizzle ORM + PostgreSQL + pgvector** (schema-per-tenant tenancy)
- **npm workspaces + Turborepo**
- **Pulumi (TypeScript)** IaC for AWS + GCP

**Read these first:**

- [`CLAUDE.md`](./CLAUDE.md) — project context for Claude Code sessions and human contributors
- [`project/BOARD.md`](./project/BOARD.md) — live status of every Epic / Story / Task
- [`docs/roadmap/MVP.md`](./docs/roadmap/MVP.md) — locked MVP-1 surface
- [`docs/vision/RAW_VISION.md`](./docs/vision/RAW_VISION.md) — the user's original brain-dump (verbatim)
- [`docs/architecture/`](./docs/architecture/) — 18 ADRs covering license / tech stack / cloud / multi-tenancy / event bus / observability / auth / AI subsystems / plugin spec / AI mechanisms / status & brand / deploy portal

**License:** [MIT](./LICENSE).
