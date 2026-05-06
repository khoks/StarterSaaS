---
id: EPIC-007
title: AI-First Features — AI config gen, AI-assisted merge, AI plugin compat, Agent Platform MVP-1
type: epic
status: backlog
priority: P0
phase: mvp
tags: [mvp, ai-features, agent-platform, ai-merge, ai-config-gen, ai-plugin-compat]
created: 2026-05-05
updated: 2026-05-05
---

## Goal

Ship the **visible AI-first value** at MVP-1 first contact: AI-assisted config generation + AI-assisted upstream merge basic + AI-validated plugin compatibility + Agent Platform MVP-1 subset. These are the differentiating AI features that make the AI-first positioning credible from minute 1.

## Capabilities (per [docs/roadmap/MVP.md](../../docs/roadmap/MVP.md))

- **AI-assisted config generation** ([D-22](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0015](../../docs/architecture/ADR-0015-ai-assisted-config-gen.md)) — NL → `starter.config.ts` pipeline; repair-and-retry max 3 against Zod schema; adapter verification via architecture registry (no hallucinated adapters); engineer-confirmation UX with diff + inline explanations; iteration loop max 5; schema-version awareness; invoked via `cli init --ai-assist` or deploy command portal step 4
- **AI-assisted upstream merge — basic version** ([D-17](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0014](../../docs/architecture/ADR-0014-ai-assisted-merge.md)) — adapter usage signature extraction from architecture registry → LLM diff analysis (Opus 4.7 default per D-35) → merge plan generation → test-first verification (run user's test suite) → confidence scoring (high / medium / low); engineer review default; autonomous-mode toggle deferred to v1
- **AI-validated plugin compatibility** ([D-23](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0013](../../docs/architecture/ADR-0013-plugin-spec-and-ai-compat.md)) — Zod-defined extension-point schemas with semver-per-ext-point; plugin manifests with kit-version-range; LLM analysis of ext-point diffs vs plugin hook signatures; sandbox sim for low-confidence cases (ephemeral DB schema + isolated event bus); engineer override + audit log
- **Agent Platform MVP-1 subset (Sub 3)** ([D-52](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0010](../../docs/architecture/ADR-0010-agent-platform.md)) — web surface only + 4 of 6 registries (skills, tools, AI-native widgets, UI shell); LangGraph-style decision-graph orchestrator; per-tenant `agent_config` in `tenant_xyz.agent_config`; channel adapter pattern; conversation state in `tenant_xyz.{conversations, messages}` (resumable); tool execution under agent's RBAC context (no escalation to platform-admin); per-skill model config per per-component LLM choice (D-47)

## Scope

- `packages/ai-config-gen` (`@starter-saas/cli init --ai-assist` flow)
- `packages/upgrade-agent` for AI-assisted merge basic version
- `packages/plugin-compat-check` for AI-validated plugin compat
- `packages/ai-agent-platform` (orchestrator core + 4 registries) + `packages/ai-agent-channels-web` (channel adapter)
- LangGraph integration with Langfuse tracing per D-46
- Per-tenant agent configuration (DB schema + admin endpoints)
- Conversation persistence with resumability
- Default skills: classify_intent, generate_response, escalation_decision (configurable per per-skill model choice)
- Default tools registry contracts (Zod-typed I/O)
- AI-native widgets registry from `packages/ai-ui` (per EPIC-006)
- UI shell for conversation (scrolling chat in `packages/ai-ui`)
- Sandbox sim environment for plugin compat (ephemeral schema + isolated outbox)
- Engineer review UI for compat-check results (CLI output + JSON for tooling)

## Out of scope (deferred per MVP.md § Out of scope)

- Subagent registry (multi-agent composition) — v1
- Non-UI embeddable agent interface — v1
- Mobile agent surface (React Native channel adapter) — v1
- Telephonic agent surface (Twilio / Vonage) — v1+
- Advanced orchestration (parallel skills, conditional routing beyond LangGraph defaults) — v1
- AI-assisted merge autonomous mode — v1
- AI-assisted merge auto-fix (LLM proposes patches) — v1+
- AI Coworker conversational UI + workflows + scheduled tasks (Sub 5 v2)
- Customer Profile Builder full subsystem (Sub 1 v1; foundation only MVP-1)
- Context-Resolving Query Service full subsystem (Sub 2 v1; foundation only MVP-1)

## Stories under this Epic

(Drafted in [STORY-012](../stories/STORY-012-mvp1-scope-lockdown.md) Q2; ≥3 expected.)

## Exit criteria

- [ ] AI-assisted config gen: engineer types NL → kit generates valid `starter.config.ts` in ≤5 minutes
- [ ] Repair-and-retry recovers from initial validation failures
- [ ] Adapter verification rejects hallucinated adapter names
- [ ] AI-assisted merge: detects upstream package update → extracts adopter customization signature → generates merge plan → runs adopter's tests → reports confidence
- [ ] Engineer review UI shows merge plan + per-change confidence + recommended fixes
- [ ] AI-validated plugin compat: extension-point spec + plugin manifest format work end-to-end
- [ ] Compat check runs LLM analysis + sandbox sim for low-confidence cases
- [ ] Agent Platform: customer signs in → opens chat → agent classifies intent → calls tool → renders widget → response streams via SSE
- [ ] Agent tool execution respects RBAC (cannot escalate)
- [ ] Per-tenant `agent_config` allows enabling/disabling skills/tools/widgets
- [ ] Conversation resumes across sessions
- [ ] Integration test: founder's-first-engineer demo flow — clone → ai-assist init → deploy with portal narration → tenant signup → user chats with agent → cost event recorded

## Related

- ADRs: [ADR-0010](../../docs/architecture/ADR-0010-agent-platform.md), [ADR-0013](../../docs/architecture/ADR-0013-plugin-spec-and-ai-compat.md), [ADR-0014](../../docs/architecture/ADR-0014-ai-assisted-merge.md), [ADR-0015](../../docs/architecture/ADR-0015-ai-assisted-config-gen.md)
- Decisions: D-15 Sub 3, D-17, D-22, D-23, D-52
- Cross-Epic: depends on EPIC-006 (LLM Gateway + ai-ui primitives + architecture registry); EPIC-003 (RBAC for tool execution) + EPIC-004 (event bus for agent state events) + EPIC-005 (observability for agent traces); feeds EPIC-008 (deploy portal AI narration is a related capability)

## Activity log

- 2026-05-05 — created as part of MVP-1 surface lockdown ([D-56](../../docs/decisions/DECISIONS_LOG.md))
