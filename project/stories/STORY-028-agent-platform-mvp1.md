---
id: STORY-028
title: Agent Platform MVP-1 subset (web + 4 of 6 registries + LangGraph orchestrator)
type: story
status: backlog
priority: P0
estimate: XL
parent: EPIC-007
phase: mvp
tags: [mvp, ai-feature, agent-platform, langgraph]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Implement Agent Platform MVP-1 subset (AI Subsystem 3) per [ADR-0010](../../docs/architecture/ADR-0010-agent-platform.md). Web surface + 4 of 6 registries (skills, tools, AI-native widgets from `packages/ai-ui`, UI shell for conversation). LangGraph-style decision-graph orchestrator. Per-tenant `agent_config` + `agent_graphs`. Channel adapter pattern per surface (web only MVP-1; mobile / telephonic v1+). Conversation state in `tenant_xyz.{conversations, messages}` (resumable across sessions). Tool execution under agent's RBAC context (no escalation to platform-admin tools). All LLM calls through Gateway with per-skill model config.

## Acceptance criteria

- [ ] `packages/ai-agent-platform` defines orchestrator core + 4 registries
- [ ] LangGraph integration with Langfuse tracing (per [D-46](../../docs/decisions/DECISIONS_LOG.md))
- [ ] Skills registry with default skills: `classify_intent`, `generate_response`, `escalation_decision`
- [ ] Tools registry with Zod-typed I/O contracts; default tools per use case
- [ ] AI-native widgets registry consuming components from `packages/ai-ui` (per STORY-023)
- [ ] UI shell for conversation (scrolling chat) in `packages/ai-ui`
- [ ] `packages/ai-agent-channels-web` ships the web channel adapter
- [ ] Per-tenant `agent_config` table + admin endpoints
- [ ] Conversation persistence (resumable across sessions)
- [ ] Tool execution under agent RBAC context (no platform-admin escalation)
- [ ] Per-skill model config per per-component LLM choice (per [D-47](../../docs/decisions/DECISIONS_LOG.md))
- [ ] Streaming responses via SSE (per STORY-023)
- [ ] Integration test: customer signs in → opens chat → agent classifies intent → calls tool → renders widget → response streams → conversation resumes after sign-out/in

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: nothing in MVP-1
- Blocked by: STORY-022 (LLM Gateway); STORY-023 (ai-ui primitives + UI shell); STORY-014 (tenant context); STORY-013 (RBAC for tool execution)

## Related

- ADRs: [ADR-0010](../../docs/architecture/ADR-0010-agent-platform.md), [ADR-0016](../../docs/architecture/ADR-0016-ai-streaming-ui-integration.md)
- Decisions: D-15 Sub 3, D-29, D-52

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
