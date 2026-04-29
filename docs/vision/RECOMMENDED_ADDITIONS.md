# Recommended additions

> Gaps the user did not explicitly mention in `RAW_VISION.md` but should consider. Maintained by the `harvest-knowledge` skill (and added to manually during grooming). Each entry is a *recommendation*, not a decision — Phase B grooming converts the worthy ones into Stories.

---

## Format

Each entry has:

- **Title** — one line
- **Why** — what gap it fills, what risk it mitigates
- **Cost estimate** — XS/S/M/L/XL
- **Phase fit** — which phase it most likely belongs to
- **Status** — `proposed` (default), `accepted` (becomes a Story), `rejected` (with reason), `deferred` (with reason and target phase)

---

## Proposed additions

### Migration path: graft existing app onto StarterSaaS

- **Why:** The primary persona ([D-13](../decisions/DECISIONS_LOG.md), founder's first engineer) typically inherits a half-built codebase rather than starting greenfield. Fresh-install flows aren't enough — adoption requires: importing an existing Postgres schema with FK preservation, wrapping an existing auth provider (e.g., a hand-rolled JWT or a Firebase auth they're trying to leave), retrofitting RBAC over a running app's models, and gradual subsystem-by-subsystem adoption (e.g., adopt notifications subsystem first, defer the gateway). Without this, "adopt StarterSaaS" effectively means "rewrite," which the first engineer can't sell to the founder.
- **Cost estimate:** L
- **Phase fit:** v1 (MVP-1 is fresh-install only; migration tooling lands once the core kit is stable)
- **Status:** proposed
- **Source:** STORY-008 Q1 lock discussion (2026-04-27)

### AI Subsystem 1: Event-driven Customer Profile Builder + AI-Native Stores

- **Why:** Anchors the AI-first differentiator ([D-15](../decisions/DECISIONS_LOG.md)). Consumes UI clickstream + event-bus messages + critical API calls; synthesizes per-customer business profile, AI-chat interaction profile, session memory, feature memory into "AI-native stores" — designed for LLM consumption alongside transactional DB and data warehouse. Replaces the "where does session memory live?" question that plagues every agent-building team. Feeds AI Subsystem 2 (Context Resolver). See [`NOVEL_IDEAS.md`](NOVEL_IDEAS.md) for full novelty analysis.
- **Cost estimate:** XL
- **Phase fit:** v1 (depends on event-bus + analytics platform existing in MVP-1)
- **Status:** proposed
- **Source:** STORY-008 Q2 differentiator discussion (2026-04-28)

### AI Subsystem 2: Context-Resolving Query Service

- **Why:** Anchors the AI-first differentiator. NL-query layer any AI agent OR non-AI feature can call when it needs prompt context but doesn't know what data to fetch or where. Spans transactional DW + AI-native stores. Centralizes data-access governance and lifts context-supply burden from per-agent integrations. See [`NOVEL_IDEAS.md`](NOVEL_IDEAS.md) for full novelty analysis (assessed: **high novelty**).
- **Cost estimate:** L
- **Phase fit:** v1 (depends on AI Subsystem 1's stores existing)
- **Status:** proposed
- **Source:** STORY-008 Q2 differentiator discussion (2026-04-28)

### AI Subsystem 3: Agent Platform + Omnichannel Orchestrator (6 registries)

- **Why:** Anchors the AI-first differentiator. SaaS-enterprise-wide agent platform with 6 explicit registries (skills + subagents + tools + AI-native UI widgets + UI shell + non-UI embed); orchestrator decides which produces what result. Surfaces span web + mobile + telephonic + embedded. The 6-registry decomposition is fresh; omnichannel + non-UI-embed unified under one platform is novel. See [`NOVEL_IDEAS.md`](NOVEL_IDEAS.md).
- **Cost estimate:** XL
- **Phase fit:** MVP-1 (subset: skills + tools + chat UI shell) → v1 (full registries) → v2 (telephonic)
- **Status:** proposed
- **Source:** STORY-008 Q2 differentiator discussion (2026-04-28)

### AI Subsystem 4: LLM Gateway + Safety + Model Hub + Eval/Feedback + Cost

- **Why:** **Foundational** — anchors AI-first credibility. Without this, AI Subsystems 1–3 + 5 cannot be safely operated. Composition of LLM gateway (provider routing) + safety guardrails (PII / profanity / illegal-advice / prompt-injection) + model hub (proprietary + self-hosted + fine-tuned, on equal footing) + eval/feedback + cost dashboards + provisioned throughput. Each individual mechanism exists as a separate product (Portkey/Helicone/LiteLLM, Lakera/NeMo Guardrails, Hugging Face, Braintrust/LangSmith, etc.) — no OSS kit ships them unified. See [`NOVEL_IDEAS.md`](NOVEL_IDEAS.md).
- **Cost estimate:** L
- **Phase fit:** **MVP-1** (gateway + safety + cost minimum); v1 (eval + feedback + model hub)
- **Status:** proposed
- **Source:** STORY-008 Q2 differentiator discussion (2026-04-28)

### AI Subsystem 5: AI Coworker Platform for Internal Ops

- **Why:** AI agents that the SaaS-enterprise's own employees use to control deployment, triage, maintenance, discovery, change management, observability, dev. Aware of every kit capability + endpoint + schema + code logic + user-added product extensions. Massive productivity multiplier (5-person SaaS runs like 25-person team). Strongly differentiated — no equivalent generic AIOps tool has local architecture awareness across kit + product extensions. See [`NOVEL_IDEAS.md`](NOVEL_IDEAS.md) (assessed: **high novelty**).
- **Cost estimate:** XL
- **Phase fit:** v2 (depends on AI Subsystems 1–4 stable; needs careful security model — agents that deploy need approval + rollback guardrails)
- **Status:** proposed
- **Source:** STORY-008 Q2 differentiator discussion (2026-04-28)

### AI-assisted upstream merge (kit-promise feature, D-17)

- **Why:** Direct response to the founder's-first-engineer (D-13) pain "I don't want to maintain platform code." Combines AI-first credibility (D-15) with subscribe-to-upstream practicality (D-16). Agent detects upstream updates, examines user customizations via adapter signatures, proposes merge plans, tests against user tests, surfaces only low-confidence conflicts. Shares mechanism with AI Subsystem 5 (Internal Ops Agent) but ships earlier because it's foundational to the kit-promise — without it, the subscribe-to-upstream promise is theoretical. See [`NOVEL_IDEAS.md`](NOVEL_IDEAS.md).
- **Cost estimate:** L
- **Phase fit:** **MVP-1** (basic: detect + propose + test); v1 (confidence scoring + autonomous-mode toggle)
- **Status:** proposed
- **Source:** STORY-008 Q3 kit-promise lock (2026-04-28)

### AI cost management + per-tenant LLM budgeting

- **Why:** AI-first kits without cost discipline go bankrupt fast. Implication of the AI-first differentiator. Per-tenant LLM budget enforcement, prompt caching with semantic-deduplication, automatic fallback to cheaper models when budget approaches threshold, cost-attribution dashboards by tenant / feature / agent. Subsumed by AI Subsystem 4's cost-dashboard scope but worth tracking separately because the per-tenant enforcement is a distinct concern.
- **Cost estimate:** M
- **Phase fit:** MVP-1 (basic budgets + caching); v1 (semantic dedup + auto-fallback)
- **Status:** proposed
- **Source:** STORY-008 Q2 differentiator discussion (2026-04-28)

<!--
Example template (uncomment when adding entries):

### Title — Audit log subsystem

- **Why:** No SaaS platform sells to enterprise without an audit log. The user's vision listed observability and ticketing but didn't call out tamper-evident audit trails. Without one, compliance reviews stall.
- **Cost estimate:** M
- **Phase fit:** v1 (post-MVP-1; auth + RBAC must land first)
- **Status:** proposed
-->

---

## Accepted (now Stories)

(empty — when proposals graduate, link to the Story under EPIC-002 or later)

## Rejected

(empty — entries here include the user's reason for rejection so future sessions don't re-propose)

## Deferred

(empty — entries here include the target phase and the trigger that would un-defer them)
