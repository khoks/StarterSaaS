# StarterSaaS — Live work board

> Read this first every session. The frontmatter in [`epics/`](./epics/), [`stories/`](./stories/), and [`tasks/`](./tasks/) is the authoritative source — this file is the human-readable summary, kept in sync by the `work-tracking` skill at session end.

**Last updated:** 2026-05-14 (STORY-019 sub-PR #1 in flight — `@starter-saas/observability` foundation)

---

## In progress

| ID | Title | Owner | Notes |
|---|---|---|---|
| EPIC-005 | Observability + AI Cost — OTel + Langfuse + dashboards + budgets + status page | user (PM) + assistant | Active. **STORY-019 sub-PR #1 in flight**: `@starter-saas/observability` foundation (OTel SDK + adaptive sampler + Pino with PII redactor + GenAI span helpers + tenant-context propagation). Sub-PRs #2-#3 follow (Fastify+Drizzle instrumentation, cost-rollup consumer) |

---

## Up next

| ID | Title | Estimate | Why next |
|---|---|---|---|
| (deferred) | OAuth via @auth/core (Google / GitHub / Apple) | M | Was STORY-013 sub-PR #4; apps/starter HTTP layer now exists — picks up as a follow-up Story |
| EPIC-006 | AI Foundation — LLM Gateway + ai-ui primitives + architecture registry | (3 Stories) | Depends on EPIC-003/004/005 |
| EPIC-007 | AI-First Features — AI config gen + AI-assisted merge + AI plugin compat + Agent Platform MVP-1 | (4 Stories) | Depends on EPIC-006 |
| EPIC-008 | UX + Deploy — Brand package + Marketing-template + Deploy CLI + command portal | (3 Stories) | Parallel; integrates with all |

---

## Backlog (Phase B grooming)

(none — all five Phase B stories are either in progress or queued in "Up next")

---

## Recently done

| ID | Title | Closed | Notes |
|---|---|---|---|
| **EPIC-004** | **Communication Plumbing — API gateway + Event bus pg-outbox + Notifications** | **2026-05-14** | **All 3 Stories closed**: STORY-016 (Fastify gateway, 3 sub-PRs #38-#40) + STORY-017 (PgOutboxEventBus + DLQ replay + saga cancel, 2 sub-PRs #41-#42) + STORY-018 (notifications package — this PR). 6 PRs. **279 tests green** across 8 packages. Complete communication backbone: HTTP layer + async event bus + saga-driven notifications |
| STORY-018 | Email notification adapter + per-tenant template system | 2026-05-14 | 1 PR (this PR) — new `@starter-saas/notifications` package: `EmailSender` contract + ConsoleEmailSender + NoopEmailSender + TemplateRegistry with 4 kit defaults + EventBusNotificationsConsumer + EventBusNotificationsSender (saga step 9 port) + per-tenant `notification_templates` table + PII scrubbing. 40 new tests. Closes EPIC-004 |
| STORY-017 | pg-outbox event bus adapter + saga primitives package + DLQ replay | 2026-05-14 | 2 sub-PRs landed: (#41) `PgOutboxEventBus` + `OutboxWriter` + `OutboxPoller` + `platform.{outbox, event_dedupe, event_dlq}` schema; (#42) `events list-dlq` / `events replay` + `sagas list` / `sagas cancel` CLI subcommands + `cancelSaga` helper + `replayDlqEntry` helper. 239 tests green across 7 packages. pg_notify wakeup + exponential backoff + durable retry counter explicitly deferred to v1+ as documented enhancements |
| STORY-016 | Fastify gateway + Zod boundary discipline + plugin extension points | 2026-05-11 | 3 sub-PRs (#38 gateway factory + tenant-context, #39 authContextPlugin + SessionResolver, this PR apps/starter reference impl). 212 tests green. First time the kit exercises a real HTTP layer end-to-end (sign-up → sign-in → /me → sign-out against PGlite). OTel + ADR-0013 plugin-spec ACs deferred to EPIC-005 + EPIC-007 |
| **EPIC-003** | **Identity + Tenancy — Auth + Tenancy infra + Multi-tenant DB** | **2026-05-11** | **All 4 Stories closed**: STORY-032 (monorepo bootstrap) + STORY-013 (auth flows; 4 sub-PRs) + STORY-014 (tenancy + saga + cross-schema; 4 sub-PRs) + STORY-015 (CLI + migration runner + archival + RBAC; 4 sub-PRs). 13 PRs. **181 tests green** across 5 packages. Real-Postgres integration via PGlite confirms saga + archival + migration + RBAC end-to-end. OAuth + UI tenant switcher deferred to apps/starter HTTP layer |
| STORY-015 | Tenant migration runner + 2-stage archival + RBAC sketch | 2026-05-11 | 4 sub-PRs landed: (#34) CLI skeleton + pglite harness; (#35) migration runner + cross-adapter `TenantDb` + end-to-end saga vs real Postgres; (#36) 2-stage archival + tenant doctor; (this PR) RBAC tables + `requireRole`/`requirePermission` middleware + `DrizzleTenantSeeder`. 181 tests green. Closes EPIC-003 |
| STORY-014 | Tenancy schema + 9-step provisioning saga + multi-tenant query primitives | 2026-05-11 | 4 sub-PRs landed: (#30) `@starter-saas/event-bus` + `@starter-saas/saga` primitives; (#31) `@starter-saas/tenancy` schemas + `DrizzleSagaStore`; (#32) 9-step provisioning saga per ADR-0004 §3; (#33) `withTenants()` cross-schema wrapper + per-tenant rate-limit middleware. 121 tests green. PgBouncer load test deferred to apps/starter |
| STORY-013 | Auth.js v5 integration with Drizzle adapter — MVP-1 sign-in flows | 2026-05-11 | 4 sub-PRs (#25 schemas+contracts, #27 email+pwd, #28 magic-link, this PR TOTP+audit+lockout+RBAC). 48 tests green. OAuth split to a follow-up Story (deferred — waits for apps/starter HTTP layer) |
| STORY-032 | Phase D monorepo workspace bootstrap | 2026-05-10 | PR #24 landed; npm workspaces + Turborepo + TS strict + tsconfig.base + 2 placeholder packages; D-57 admin-merge expansion logged |
| EPIC-002 | Phase B grooming — vision, requirements, architecture, tech stack | 2026-05-06 | All 5 Stories closed (STORY-008/010/011/009/012); 45 decisions D-12..D-56; 18 ADRs ADR-0001..ADR-0018; MVP-1 surface locked; 6 MVP-1 Epics + 19 Phase D Stories drafted |
| STORY-012 | MVP-1 scope lockdown — 19 capabilities in 6 Epics | 2026-05-06 | D-56 MVP-1 surface + docs/roadmap/MVP.md v1 + 6 Epic stubs (EPIC-003..008) + 19 Stories drafted (STORY-013..031) |
| STORY-009 | Architecture grooming — tenancy / event bus / observability / auth / AI subsystems / plugin / AI mechanisms / ml platform / data quality | 2026-05-05 | 12 decisions locked (D-44..D-55), 12 ADRs accepted (ADR-0004..ADR-0018); 6 Q-bundles (multi-tenancy + event bus & saga + observability & LLM Gateway + auth & status/brand/admin + 4 AI subsystems + 5 cross-cutting + ML/data-quality); architecture registry foundation MVP-1 |
| STORY-011 | Cloud-target decision — AWS / GCP / both | 2026-05-02 | 5 decisions locked (D-39..D-43), ADR-0003 written and accepted; both AWS + GCP MVP-1 + Pulumi TS + 10-step idempotent CLI + local command portal (NOVEL_IDEAS) |
| STORY-010 | Tech-stack decision — backend / frontend / polyglot | 2026-05-02 | 13 decisions locked (D-24..D-38), ADR-0002 written and accepted; full TS stack: Node + Fastify + Next + Astro + npm + Turborepo + Drizzle + Postgres + schema-per-tenant + pgvector + Anthropic + OpenAI + Ollama + Opus 4.7 kit-default |
| STORY-008 | Vision grooming — persona, differentiator, kit promise | 2026-04-28 | 12 decisions locked (D-12..D-23), 7 NOVEL_IDEAS entries, 4 RECOMMENDED_ADDITIONS, CLAUDE.md vision updated to AI-first |
| EPIC-001 | Phase A bootstrap — repo, skills, tracking, GitHub | 2026-04-25 | Repo at https://github.com/khoks/StarterSaaS; PR #1 auto-merged |
| STORY-007 | End-to-end auto-PR validation cycle | 2026-04-25 | PR #1 squash-merged (commit `5f2ab0a`) |
| STORY-006 | GitHub remote — `gh repo create khoks/StarterSaaS --private` | 2026-04-25 | Private repo created; bootstrap pushed |
| STORY-005 | License, README, gitignore, gitattributes, .github files | 2026-04-25 | MIT license, full root meta + .github files |
| STORY-004 | In-repo tracking system | 2026-04-25 | `project/` conventions + templates + 2 epics + 12 stories + BOARD |
| STORY-003 | Three Claude Code skills + Stop hook | 2026-04-25 | `harvest-knowledge` + `work-tracking` + `auto-pr` chained via `.claude/settings.json` |
| STORY-002 | CLAUDE.md + vision capture | 2026-04-25 | CLAUDE.md + RAW_VISION.md (verbatim) + placeholders |
| STORY-001 | Folder skeleton + bootstrap directory tree | 2026-04-25 | Directory tree created; `git init` complete (commit `82ff650`) |

---

## Blocked

(none)

---

## Canceled

(none)

---

## Epic index

| Epic | Status | Phase | Stories |
|---|---|---|---|
| [EPIC-001](./epics/EPIC-001-bootstrap.md) | done | scaffolding | STORY-001 → STORY-007 (all done) |
| [EPIC-002](./epics/EPIC-002-grooming.md) | done | scaffolding | All 5 Stories done; 45 decisions, 18 ADRs, MVP-1 surface locked, Phase D Epics ready |
| [EPIC-003](./epics/EPIC-003-identity-tenancy.md) | **done** | mvp | All 4 Stories closed (STORY-032/013/014/015) — 181 tests green across 5 packages |
| [EPIC-004](./epics/EPIC-004-communication-plumbing.md) | **done** | mvp | All 3 Stories closed (STORY-016/017/018) — 279 tests green across 8 packages |
| [EPIC-005](./epics/EPIC-005-observability-ai-cost.md) | backlog | mvp | Observability + AI Cost: OTel + Langfuse + cost dashboards + budgets + status page |
| [EPIC-006](./epics/EPIC-006-ai-foundation.md) | backlog | mvp | AI Foundation: LLM Gateway + ai-ui primitives + architecture registry |
| [EPIC-007](./epics/EPIC-007-ai-first-features.md) | backlog | mvp | AI-First Features: AI config gen + AI-assisted merge + AI plugin compat + Agent Platform MVP-1 |
| [EPIC-008](./epics/EPIC-008-ux-deploy.md) | backlog | mvp | UX + Deploy: Brand package + Marketing-template + Deploy CLI & command portal |

---

## Conventions

See [`README.md`](./README.md) for full conventions. Quick reference:

- **Status flow**: `backlog → todo → in-progress → review → done` (with `blocked` / `canceled` from any state)
- **Priorities**: P0 (critical) / P1 (important) / P2 (nice) / P3 (low)
- **Phases**: `scaffolding` / `mvp` / `v1` / `v2` / `v3`
- **Find in-progress items**: `grep -l "status: in-progress" project/{epics,stories,tasks}/*.md`

---

## Phase A retrospective notes

- Bootstrap commit landed directly on `main` (per D-10): `82ff650` (40 files, 2325 insertions)
- First auto-PR (#1, commit `5f2ab0a`) closed STORY-001…STORY-006 + progressed STORY-007 to `in-progress`
- Phase A retrospective: scope held — no source code touched, no tech-stack speculation, no scope creep
- Branch protection on `main` is **configured strict** (1 review required, markdown-lint required, linear history, no force-push) — discovered during STORY-008 Q1 merge attempt. Per D-14, the assistant is authorized to use `gh pr merge --admin --squash` for **doc-only / tracking-only PRs** to land grooming and housekeeping work without manual review. Source-code PRs (Phase D onward) follow normal review flow.
- Plan filename `i-want-to-build-happy-cocke.md` (speech-to-text artifact) can be safely deleted from `~/.claude/plans/`
