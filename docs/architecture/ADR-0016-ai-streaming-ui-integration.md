# ADR-0016 — AI-streaming UI primitives integration with AI Sub 3 + LLM Gateway

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)

---

## Context

[D-29](../decisions/DECISIONS_LOG.md) locked `packages/ai-ui` as MVP-1: streaming-message, agent-step, token-counter, RAG-source-citation, prompt-input, tool-call-card React primitives. [ADR-0010](./ADR-0010-agent-platform.md) defines the Agent Platform (Sub 3) that uses these primitives. [ADR-0011](./ADR-0011-llm-gateway.md) defines the LLM Gateway. [ADR-0006](./ADR-0006-observability.md) covers observability.

This ADR locks how the UI primitives integrate with the agent runtime + Gateway: streaming protocol, component-orchestrator coupling, accessibility, error handling, brand integration.

## Decision

### Streaming protocol

| Protocol | Use | Phase |
|---|---|---|
| **Server-Sent Events (SSE)** | Primary streaming protocol for agent → UI | **MVP-1** |
| **Streaming HTTP (chunked)** | Fallback for environments where SSE has issues | **MVP-1** |
| **WebSockets** | Bidirectional needs (voice, real-time collab) | **v1+** |

Reasoning:

- SSE is simpler than WebSockets, has native browser support, integrates cleanly with Next.js App Router (D-27) RSC + streaming
- Streaming HTTP fallback covers proxies / environments that strip SSE
- WebSockets defer to v1+ when bidirectional features land

### Event types

```typescript
// On-the-wire format (Zod-validated per D-25)
type StreamEvent =
  | { kind: "message_chunk"; content: string; partial: true }
  | { kind: "message_complete"; messageId: string; tokens: TokenUsage }
  | { kind: "agent_step"; step: AgentStepInfo; status: "pending" | "running" | "complete" | "failed" }
  | { kind: "tool_call"; toolName: string; args: unknown; callId: string }
  | { kind: "tool_result"; callId: string; result: unknown; durationMs: number }
  | { kind: "rag_citation"; sourceId: string; relevance: number; snippet: string }
  | { kind: "error"; code: string; recoverable: boolean; message: string }
  | { kind: "stream_end"; reason: "complete" | "user_canceled" | "timeout" | "error" }
```

Each event type has a corresponding ai-ui component that renders it.

### Component-to-orchestrator integration

```typescript
// React context provided by AgentSession
const { stream, send, cancel, state } = useAgentSession({ agentId, conversationId });

// stream is an AsyncIterable<StreamEvent>; components subscribe by kind
<StreamingMessage stream={stream.filter("message_chunk", "message_complete")} />
<AgentStepList stream={stream.filter("agent_step")} />
<TokenCounter stream={stream.filter("message_complete")} />
<ToolCallCard stream={stream.filter("tool_call", "tool_result")} />
```

The ai-ui components are decoupled from the orchestrator — they consume typed event streams, not orchestrator internals. This means:

- ai-ui works in Next, Remix, Astro islands, Vite SPA per [D-27](../decisions/DECISIONS_LOG.md) framework-agnostic React
- Adopters can drive ai-ui from custom orchestrators (e.g., adopter-built agent runtime) by emitting compatible events

### LLM Gateway integration

The Gateway ([ADR-0011](./ADR-0011-llm-gateway.md)) emits SSE events natively (not buffered):

- LLM provider's stream → Gateway middleware (safety filters, cost accounting) → SSE chunks to client
- Per-chunk PII scrubbing on output (per [ADR-0006](./ADR-0006-observability.md))
- Token-counter accumulates across chunks; final tally on `message_complete`

### Accessibility (a11y)

Critical for streaming UIs — naive implementations strand screen-reader users:

| Concern | Solution |
|---|---|
| **Streaming text announcements** | ARIA live region with `aria-live="polite"`; debounced announcements (every 250ms while streaming) |
| **Focus management** | Focus stays on input until user navigates away; doesn't jump as content streams in |
| **Step transitions** | Status changes announced (`aria-live="assertive"` for errors; `polite` for steps) |
| **Tool call rendering** | Tool calls have explicit titles + structured content; navigable via headings |
| **Error states** | Errors announced loudly; recovery affordance (retry button) keyboard-accessible |
| **Cancel** | Always keyboard-accessible (Esc by default) |

WCAG 2.1 AA compliance target for MVP-1. Enforced by axe-core tests in CI.

### Error states

| Failure | Behavior |
|---|---|
| **Mid-stream chunk timeout** | Show "Hmm, taking longer than expected..." indicator after N seconds (default 10s); offer cancel |
| **Network loss** | Auto-reconnect with `Last-Event-ID` header for SSE resume; show "Reconnecting..." state |
| **Provider error (rate limit, token limit)** | Show typed error UI with retry affordance; LLM Gateway surfaces structured error code |
| **Conversation state lost** | Show "Conversation reset" message + offer to restore from `tenant_xyz.conversations` history |
| **Tool execution timeout** | Tool-call-card shows timeout state; engineer-configurable timeout per tool ([ADR-0010](./ADR-0010-agent-platform.md)) |

### Brand integration

ai-ui components consume `@starter-saas/brand` tokens ([ADR-0017](./ADR-0017-status-brand-admin.md)):

- Color tokens for message bubbles, agent step indicators, error states
- Typography tokens for body / code / quote rendering
- Spacing tokens for layout consistency
- Logo placement in chat shell (configurable position)

Adopter overrides via `starter.config.ts → brand: { ... }` per [D-49](../decisions/DECISIONS_LOG.md) — same model.

### Side picks (locked)

| Setting | Default | Adopter-tunable? |
|---|---|---|
| Streaming protocol | SSE primary | Yes (per agent surface) |
| Reconnect strategy | Exponential backoff with `Last-Event-ID` resume | Yes |
| Mid-stream stuck timeout | 10 seconds | Yes |
| ARIA debounce interval | 250ms | Yes |
| WCAG compliance target | 2.1 AA | No (raise floor) |

## Considered alternatives

- **WebSockets primary** — rejected: more complex than needed for unidirectional agent → UI streaming; SSE is the simpler fit
- **Polling** — rejected: latency, cost, defeats the streaming UX
- **Full bidirectional from day 1** — rejected: voice / real-time collab are v1+ features; can ship WebSocket adapter then
- **Coupled component-to-orchestrator** — rejected: violates D-16 framework-agnostic + D-27 multi-framework UI components
- **No accessibility floor** — rejected: WCAG 2.1 AA is enterprise SaaS table-stakes

## Consequences

### Positive

- **AI-first claim materially honored** — visible streaming AI primitives at MVP-1 demo
- **Multi-framework UI portability preserved** (D-27)
- **a11y-floor by default** — adopters don't have to retrofit
- **Loose component-orchestrator coupling** — adopters can drive ai-ui with custom orchestrators

### Negative / accepted tradeoffs

- **SSE has known proxy / firewall issues in some environments** — mitigated by streaming HTTP fallback
- **No bidirectional support MVP-1** — voice / real-time collab adopters wait for v1+
- **a11y discipline ongoing** — accessibility regressions easy without ongoing testing; CI axe-core runs catch most

### Cross-cutting

- [ADR-0010](./ADR-0010-agent-platform.md) — orchestrator emits StreamEvents; ai-ui consumes
- [ADR-0011](./ADR-0011-llm-gateway.md) — Gateway streams provider responses via SSE
- [ADR-0017](./ADR-0017-status-brand-admin.md) — brand tokens drive ai-ui appearance
- [ADR-0006](./ADR-0006-observability.md) — every stream emits OTel spans; per-chunk PII scrubbing
- [D-43](../decisions/DECISIONS_LOG.md) — deploy portal uses SSE for narration streaming

## Implementation notes

- `packages/ai-ui` — React primitives + SSE consumer hooks
- `packages/ai-ui/streaming` — protocol implementations (SSE, streaming HTTP, WebSockets)
- `useAgentSession` hook is the integration entry point
- `StreamEvent` Zod schemas exported as both runtime values + inferred types
- a11y tests via `@axe-core/react` in CI; accessibility regressions block PR merge
- Brand integration via CSS variables generated from `@starter-saas/brand`

## Revisit triggers

- **SSE issues in adopter environments** — promote streaming-HTTP from fallback to primary; consider WebSocket
- **Voice / real-time-collab adopter demand** — promote WebSocket from v1+ to v1
- **a11y compliance escapes** — tighten CI gates; expand axe-core rule set
- **Component-orchestrator coupling pressure** — adopter wants custom orchestrator events → expand StreamEvent union with adopter extensions
