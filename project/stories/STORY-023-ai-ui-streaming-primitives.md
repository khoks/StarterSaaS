---
id: STORY-023
title: packages/ai-ui — 6 React primitives + SSE streaming protocol + WCAG 2.1 AA
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-006
phase: mvp
tags: [mvp, ai-ui, streaming, accessibility]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Ship `packages/ai-ui` per [D-29](../../docs/decisions/DECISIONS_LOG.md) and [ADR-0016](../../docs/architecture/ADR-0016-ai-streaming-ui-integration.md). Framework-agnostic React components: streaming-message, agent-step, token-counter, RAG-source-citation, prompt-input, tool-call-card. SSE primary streaming protocol; streaming-HTTP fallback; WebSockets v1+. Component-orchestrator decoupled via Zod-typed `StreamEvent` union + React context (`useAgentSession` hook). WCAG 2.1 AA accessibility floor enforced by axe-core in CI. Brand integration via `@starter-saas/brand` tokens (per STORY-029).

## Acceptance criteria

- [ ] All 6 React primitives ship: streaming-message, agent-step, token-counter, RAG-source-citation, prompt-input, tool-call-card
- [ ] Components are framework-agnostic React (no Next-specific imports); usable in Next App Router, Remix, Astro islands, Vite SPA
- [ ] `StreamEvent` Zod-typed union exported (message_chunk, message_complete, agent_step, tool_call, tool_result, rag_citation, error, stream_end)
- [ ] `useAgentSession` hook provides typed event stream + send/cancel APIs
- [ ] SSE protocol implementation primary
- [ ] Streaming-HTTP fallback works in proxy/firewall environments where SSE has issues
- [ ] Reconnect-and-resume via `Last-Event-ID` header
- [ ] ARIA live regions for streaming text (debounced 250ms)
- [ ] Focus management: focus stays on input until user navigates
- [ ] Error states: typed error UI + retry affordance
- [ ] Brand token consumption via CSS variables from `@starter-saas/brand`
- [ ] axe-core tests pass in CI; WCAG 2.1 AA compliance verified
- [ ] Integration test: streaming agent response renders correctly + screen-reader announces + brand colors apply

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: STORY-028 (Agent Platform uses ai-ui); STORY-031 (deploy portal uses ai-ui for narration UI)
- Blocked by: STORY-029 (brand package must exist for token consumption)

## Related

- ADRs: [ADR-0016](../../docs/architecture/ADR-0016-ai-streaming-ui-integration.md)
- Decisions: D-27, D-29

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
