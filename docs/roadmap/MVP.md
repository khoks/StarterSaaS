# MVP-1 Scope

> **Status: locked 2026-05-05** as part of [STORY-012](../../project/stories/STORY-012-mvp1-scope-lockdown.md). Closes Phase B. Phase D implementation may begin once this document and per-Epic Story decompositions are complete.

---

## Mission (from [D-15](../decisions/DECISIONS_LOG.md))

> **AI-first, production-grade SaaS platform — 30+ integrated layers you will eventually need, white-labelable, one-command deployable.**

## Primary persona (from [D-13](../decisions/DECISIONS_LOG.md))

The **founder's first engineer** at a 1-5 person company. They have authority + urgency + technical chops + felt-pain at once. Day-1 demo to founder is the critical moment. Self-host is the default; managed is a v1+ adapter swap.

## What MVP-1 promises

A founder's first engineer clones the kit, runs `npx @starter-saas/cli init --ai-assist`, describes their SaaS in natural language, picks AWS or GCP, runs `cli deploy`, and within ~30 minutes has:

- A working multi-tenant SaaS deployed end-to-end
- Auth + RBAC + tenant provisioning all functional
- A working customer-facing AI chat agent (web)
- Cost dashboards + per-tenant LLM budget enforcement
- Marketing site at a sibling repo
- Status page at `status.<adopter-domain>`
- A built-in admin observability dashboard
- AI-assisted upgrade path (kit upgrades itself with engineer review)

---

## MVP-1 Surface — 19 capabilities organized as 6 Epics

### EPIC-003 — Identity + Tenancy

| # | Capability | Source decision / ADR |
|---|---|---|
| 1 | **Auth (Auth.js + tenant-aware + RBAC sketch)** — email+pwd / magic link / OAuth (Google/GitHub/Apple) / TOTP 2FA; tenant memberships via `platform.user_tenant`; per-tenant roles | [D-48](../decisions/DECISIONS_LOG.md) / [ADR-0007](../architecture/ADR-0007-auth-provider.md) |
| 2 | **Tenancy infrastructure** — schema-per-tenant + 9-step provisioning saga + `tenant migrate` runner + 2-stage archival + legal-hold | [D-33](../decisions/DECISIONS_LOG.md) / [D-44](../decisions/DECISIONS_LOG.md) / [ADR-0004](../architecture/ADR-0004-multi-tenancy.md) |
| 3 | **Multi-tenant DB** — Postgres + Drizzle + pgvector + drizzle-kit + PgBouncer prod / native pool dev | [D-32](../decisions/DECISIONS_LOG.md) / [D-37](../decisions/DECISIONS_LOG.md) |

### EPIC-004 — Communication Plumbing

| # | Capability | Source decision / ADR |
|---|---|---|
| 4 | **API gateway (Fastify)** — strict + Zod boundary discipline | [D-24](../decisions/DECISIONS_LOG.md) / [D-25](../decisions/DECISIONS_LOG.md) |
| 5 | **Event bus + saga** — Kafka-shaped contract; pg-outbox MVP-1 (atomic-with-business-state); event-driven choreography; `platform.saga_instances` | [D-45](../decisions/DECISIONS_LOG.md) / [ADR-0005](../architecture/ADR-0005-event-bus.md) |
| 6 | **Notifications** — email at minimum; SMS / push / WhatsApp v1+; adapter pattern for SES / SendGrid / Resend / Twilio | implied by foundation |

### EPIC-005 — Observability + AI Cost

| # | Capability | Source decision / ADR |
|---|---|---|
| 7 | **Observability stack** — OTel SDK + GenAI semconv + Pino logs + cloud-native backend (CloudWatch / Cloud Logging) **+ Langfuse** for LLM-app deep-dive | [D-46](../decisions/DECISIONS_LOG.md) / [ADR-0006](../architecture/ADR-0006-observability.md) |
| 8 | **AI cost + budget enforcement** — cost dashboards (per-provider / per-tenant / per-feature) + `platform.tenant_budgets` (hard / soft 80%) + Anthropic prompt caching | [D-38](../decisions/DECISIONS_LOG.md) / [D-46](../decisions/DECISIONS_LOG.md) |
| 9 | **Built-in lightweight status page + Instatus adapter** — auto-updated from observability incidents; 4-tier severity | [D-49](../decisions/DECISIONS_LOG.md) / [ADR-0017](../architecture/ADR-0017-status-brand-admin.md) |

### EPIC-006 — AI Foundation

| # | Capability | Source decision / ADR |
|---|---|---|
| 10 | **LLM Gateway (Sub 4)** — policy enforcement point + observability choke point: Safety + Model Hub (Anthropic + OpenAI + Ollama MVP-1 + adopter-hosted custom) + Eval/Cost | [D-15](../decisions/DECISIONS_LOG.md) Sub 4 / [D-47](../decisions/DECISIONS_LOG.md) / [ADR-0011](../architecture/ADR-0011-llm-gateway.md) |
| 11 | **AI-streaming UI primitives** (`packages/ai-ui`) — streaming-message + agent-step + token-counter + RAG-source-citation + prompt-input + tool-call-card; framework-agnostic React; SSE primary | [D-29](../decisions/DECISIONS_LOG.md) / [ADR-0016](../architecture/ADR-0016-ai-streaming-ui-integration.md) |
| 12 | **Architecture registry foundation** (`platform.architecture_registry`) — auto-populated from package graph + Zod schemas + ADRs; queryable by AI agents | [D-53](../decisions/DECISIONS_LOG.md) / [ADR-0012](../architecture/ADR-0012-ai-coworker-internal-ops.md) |

### EPIC-007 — AI-First Features

| # | Capability | Source decision / ADR |
|---|---|---|
| 13 | **AI-assisted config generation** (NL → `starter.config.ts`) — repair-and-retry max 3 + adapter verification via registry + engineer-confirmation UX + iteration loop max 5 | [D-22](../decisions/DECISIONS_LOG.md) / [ADR-0015](../architecture/ADR-0015-ai-assisted-config-gen.md) |
| 14 | **AI-assisted upstream merge** (basic: detect + propose + test) — adapter usage signature extraction + LLM diff analysis + test-first verification + confidence scoring + engineer review default | [D-17](../decisions/DECISIONS_LOG.md) / [ADR-0014](../architecture/ADR-0014-ai-assisted-merge.md) |
| 15 | **AI-validated plugin compatibility** — Zod ext-point spec + plugin manifest + LLM analysis + sandbox sim for low-confidence | [D-23](../decisions/DECISIONS_LOG.md) / [ADR-0013](../architecture/ADR-0013-plugin-spec-and-ai-compat.md) |
| 16 | **Agent Platform MVP-1 subset** (Sub 3) — web surface + 4 of 6 registries (skills, tools, AI-native widgets, UI shell) + LangGraph orchestrator + per-tenant `agent_config` + RBAC-scoped tool execution | [D-52](../decisions/DECISIONS_LOG.md) / [ADR-0010](../architecture/ADR-0010-agent-platform.md) |

### EPIC-008 — UX + Deploy

| # | Capability | Source decision / ADR |
|---|---|---|
| 17 | **Brand package** (`@starter-saas/brand`) — logo + color tokens + typography + copy + OG images; Tailwind config consumes tokens; `mode: "raw"` opt-out | [D-49](../decisions/DECISIONS_LOG.md) / [ADR-0017](../architecture/ADR-0017-status-brand-admin.md) |
| 18 | **Marketing-template** (`packages/marketing-template`, Astro) — sibling repo template; SEO + partial hydration; multi-framework editor support | [D-18](../decisions/DECISIONS_LOG.md) / [D-27](../decisions/DECISIONS_LOG.md) |
| 19 | **Deploy CLI + command portal** — `@starter-saas/cli` with `init` / `deploy` / `tenant` / `teardown` / `doctor`; 10-step idempotent flow; **local web/TUI portal** with pause/resume/abort + AI narration | [D-42](../decisions/DECISIONS_LOG.md) / [D-43](../decisions/DECISIONS_LOG.md) / [ADR-0018](../architecture/ADR-0018-deploy-portal-mechanism.md) |

### Sub-foundations that ship MVP-1 but are NOT full subsystems yet

These are **foundation only** at MVP-1 — full subsystem v1+:

- **Customer Profile Builder foundation** ([D-50](../decisions/DECISIONS_LOG.md) / [ADR-0008](../architecture/ADR-0008-customer-profile-builder.md)): event-bus consumer + 5 default profile types are v1; foundation MVP-1 means pgvector + LLM Gateway are wired and ready
- **Context-Resolving Query Service foundation** ([D-51](../decisions/DECISIONS_LOG.md) / [ADR-0009](../architecture/ADR-0009-context-resolving-query.md)): full 3-layer pipeline is v1; MVP-1 ships the LLM Gateway + AI-native stores it depends on

---

## Exit criteria for Phase D (when MVP-1 is "done")

- All 19 capabilities ship to production-quality (typed boundaries via Zod per [D-25](../decisions/DECISIONS_LOG.md); test coverage; ADR-aligned implementation)
- One-command deploy succeeds on **AWS AND GCP** (per [D-39](../decisions/DECISIONS_LOG.md))
- **Full integration test passes**: provision tenant → user signs in → invokes AI feature (e.g., chat with agent) → cost event recorded → notification fires → all observable in dashboards
- Adopter can fork + brand + deploy in **<30 minutes** with AI-assisted config gen ([D-22](../decisions/DECISIONS_LOG.md))
- **Subscribe-to-upstream tested**: kit can ship a minor version bump and adopter can apply via AI-assisted merge ([D-17](../decisions/DECISIONS_LOG.md))
- Documentation: `README.md` + `docs/getting-started.md` + per-package `README.md` + ADRs (already written) + architecture diagram

---

## Dependency map (Epic ordering)

```text
EPIC-003 Identity + Tenancy ────┐
                                 │
EPIC-004 Communication ──────────┼─→ EPIC-006 AI Foundation ──→ EPIC-007 AI-First Features ──→ MVP-1 Done
                                 │                                                           ↑
EPIC-005 Observability ──────────┘                                                           │
                                                                                              │
EPIC-008 UX + Deploy ────────────────────────────────────────────────────────────────────────┘
```

- **EPIC-003 + EPIC-004 + EPIC-005** are foundational; **EPIC-006** (AI Foundation) depends on all three
- **EPIC-007** (AI-First Features) depends on EPIC-006
- **EPIC-008** (UX + Deploy) is parallel; integrates with all
- Phase D may parallelize across Epics where dependencies allow

---

## Out of scope (slated v1+ — explicit deferrals)

| Capability | Phase | Reason |
|---|---|---|
| Full Customer Profile Builder (Sub 1) | v1 | Foundation only MVP-1; full subsystem v1 |
| Full Context-Resolving Query Service (Sub 2) | v1 | Same |
| Mobile agent surface (React Native) | v1 | Channel adapter non-trivial |
| Telephonic agent surface (Twilio / Vonage) | v1+ | Channel adapter complex |
| Subagent registry (multi-agent composition) | v1 | Adds debug complexity |
| Non-UI embeddable agent interface | v1 | Static-widget embedding |
| AI Coworker conversational UI + workflows + scheduled tasks (Sub 5 full) | v2 | MVP-1 lite via D-17/D-22/D-23 covers the visible value |
| ML platform adapters (SageMaker / Vertex AI / MLflow / W&B) | v1+ | Most MVP-1 adopters won't need traditional ML |
| Data quality declarative-rules adapters (Great Expectations / Soda) | v1+ | Zod-everywhere covers MVP-1 |
| Auth flows: SAML SSO | v1+ | Enterprise SaaS-buyers; configuration-heavy |
| Auth flows: OIDC (custom IdP) | v1+ | Rare at MVP-1 |
| Auth flows: Passkeys / WebAuthn | v1+ | Maturing standard |
| Auth adapters: Clerk / Auth0 / AWS Cognito / GCP Identity Platform / WorkOS / Authelia / Ory Kratos | v1+ | Auth.js MVP-1 default |
| Admin UI implementation (contract MVP-1, impl v1+) | v1+ | Contract locked; impl waits for adopter signal |
| Status page integrations beyond built-in + Instatus | v1+ | Atlassian Statuspage / Better Stack / Cachet |
| Multi-cloud per adopter (per-deploy multi-cloud) | v1+ | One-cloud-per-deploy MVP-1 |
| Multi-region per cloud (HA / DR) | v1+ | Single-region MVP-1 |
| Kafka adapter for event bus (target state) | v1 | Pre-architected per D-45 |
| Redis Streams / AWS EventBridge / GCP Pub/Sub event-bus adapters | v1+ | pg-outbox MVP-1 |
| ORM alternatives (Prisma / Kysely / native) | v1+ | Drizzle MVP-1 |
| Saga external orchestrator (Temporal / Conductor) | v2 | Choreography covers MVP-1 |
| Re-embedding migration tool | v1 | Manual re-embed MVP-1 |
| AI-assisted merge autonomous mode | v1 | Engineer-review-required MVP-1 |
| AI-assisted merge auto-fix (LLM proposes patches) | v1+ | Trust-but-verify MVP-1 |
| `--dry-run` flag for deploy | v1+ | Default deploy idempotent |
| Vector DB adapters: Qdrant / Pinecone / Weaviate | v1+ | pgvector MVP-1 |
| Notification adapters: SMS (Twilio) / push (FCM/APNs) / WhatsApp | v1+ | Email MVP-1 |
| Self-hosted Postgres in VPC | v1+ | Managed RDS Aurora / Cloud SQL MVP-1 |
| Multi-step Coworker workflows + scheduled tasks (Sub 5 v2) | v2 | After MVP-1 lite has field testing |

---

## Story decomposition

Each Epic gets at least 3 Stories drafted in [STORY-012 Q2](../../project/stories/STORY-012-mvp1-scope-lockdown.md). Total expected: ~18-24 Stories across 6 Epics. Phase D expands each Story with full implementation detail (file lists, test plans, verification steps).

---

## Cross-references

- **Mission + thesis**: [D-15](../decisions/DECISIONS_LOG.md) (AI-first differentiator) + [D-13](../decisions/DECISIONS_LOG.md) (founder's first engineer persona)
- **Tech stack**: [ADR-0002](../architecture/ADR-0002-tech-stack.md)
- **Cloud target**: [ADR-0003](../architecture/ADR-0003-cloud-target.md)
- **All architecture ADRs**: [ADR-0004 through ADR-0018](../architecture/)
- **Vision**: [`docs/vision/RAW_VISION.md`](../vision/RAW_VISION.md), [`docs/vision/GROOMED_FEATURES.md`](../vision/GROOMED_FEATURES.md)
- **Novel ideas in MVP-1**: AI-assisted upstream merge ([D-17](../decisions/DECISIONS_LOG.md)), AI-assisted config gen ([D-22](../decisions/DECISIONS_LOG.md)), AI-validated plugin compat ([D-23](../decisions/DECISIONS_LOG.md)), local deploy command portal ([D-43](../decisions/DECISIONS_LOG.md)) — all in [`docs/vision/NOVEL_IDEAS.md`](../vision/NOVEL_IDEAS.md)
