# ADR-0010 — AI Subsystem 3: Agent Platform + Omnichannel Orchestrator (6 registries)

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)

---

## Context

Per RAW_VISION:

> "There has to be a 3rd AI system in the SAS Enterprise which will be an agent platform... will act Saas enterprise level agent orchestrator it will have its AI skills registry... subagent registry... tool registry... AI native widget or component registry for UI... UI shell for conversation with scrolling interface... non UI interface for embedding inside static widgets..."

This ADR locks the customer-facing agent platform. (Internal-ops agents are [ADR-0012](./ADR-0012-ai-coworker-internal-ops.md).)

Constraints:

- [D-15](../decisions/DECISIONS_LOG.md) phase fit: MVP-1 subset → v1 full
- [D-29](../decisions/DECISIONS_LOG.md) `packages/ai-ui` ships MVP-1 — agent platform consumes it
- [D-47](../decisions/DECISIONS_LOG.md) LLM Gateway — all LLM calls through it
- [D-46](../decisions/DECISIONS_LOG.md) Langfuse for agent flow tracing
- [D-48](../decisions/DECISIONS_LOG.md) RBAC for tool execution permission
- [D-33](../decisions/DECISIONS_LOG.md) schema-per-tenant for conversation isolation

## Decision

### Phase fit

| Component | Phase |
|---|---|
| LangGraph orchestrator | **MVP-1** |
| 4 of 6 registries: skills, tools, AI-native widgets, UI shell | **MVP-1** |
| Web surface (channel adapter) | **MVP-1** |
| Per-tenant agent configuration | **MVP-1** |
| Conversation state (resumable) | **MVP-1** |
| Subagent registry (multi-agent composition) | **v1** |
| Non-UI embeddable interface | **v1** |
| Mobile surface (React Native channel adapter) | **v1** |
| Telephonic surface (Twilio / Vonage adapter) | **v1+** |
| Advanced orchestration (parallel skills, conditional routing) | **v1** |

### 6 registries

| # | Registry | Contents | Phase |
|---|---|---|---|
| 1 | **Skills** | Reusable prompts / skill definitions; e.g., `summarize`, `classify_intent`, `extract_entities`, `generate_response`. Each has typed I/O via Zod. | MVP-1 |
| 2 | **Subagents** | Composed agents that delegate to other agents | v1 |
| 3 | **Tools** | Callable functions with Zod-typed I/O; e.g., `search_orders`, `create_ticket`, `get_account_balance` | MVP-1 |
| 4 | **AI-native widgets / UI components** | React components from [`packages/ai-ui`](../decisions/DECISIONS_LOG.md) (per D-29) that agents render in conversation | MVP-1 |
| 5 | **UI shell for conversation** | Scrolling chat interface (in `packages/ai-ui`) | MVP-1 |
| 6 | **Non-UI interface** | Embeddable in static widgets / non-conversational experiences | v1 |

### Orchestrator: LangGraph-style decision graph

```text
                    [Skill: classify_intent]
                          ↓
           ┌──────────────┴───────────────┐
           ↓                              ↓
   [Tool: search_orders]          [Skill: generate_response]
           ↓                              ↓
   [Widget: order_card]           [Skill: detect_escalation]
           ↓                              ↓
   [Skill: generate_response]     [Tool: route_to_human]
           ↓                              ↓
   [Output to UI shell]           [Output to UI shell]
```

Each node is a skill / subagent / tool / widget. Edges = state transitions based on agent reasoning + observed inputs. Per-tenant graph definitions in `tenant_xyz.agent_graphs`.

### Channel adapter pattern

Each surface translates the UI shell into the surface's render model:

```typescript
interface ChannelAdapter {
  surface: 'web' | 'mobile' | 'telephonic';
  renderTurn(turn: AgentTurn): SurfaceRenderResult;
  captureInput(): Promise<UserInput>;
  capabilities: {
    supportsWidgets: boolean;       // e.g., telephonic does not
    supportsStreaming: boolean;     // e.g., voice can use SSML chunks
    supportsAttachments: boolean;
  };
}
```

MVP-1 ships `WebChannelAdapter`. Mobile + telephonic adapters land v1.

### Per-tenant configuration

```text
tenant_xyz.agent_config         which skills / tools / widgets enabled per agent
tenant_xyz.agent_graphs         LangGraph definitions per agent
tenant_xyz.conversations        active conversations
tenant_xyz.messages             conversation message history
```

Each tenant configures which skills / tools / widgets are enabled in their agent platform; lives in `tenant_xyz.agent_config`. RBAC determines which platform / tenant admins can edit.

### Tool execution under RBAC

Critical: tools run in the agent's RBAC context, not the user's.

- A customer-facing agent has a system role like `customer_facing_agent` with tightly-scoped permissions
- Tool execution: `if (agent.role.has(tool.requiredPermission)) { execute } else { error }`
- A customer-facing agent CANNOT escalate to platform-admin tools (per [ADR-0007](./ADR-0007-auth-provider.md))
- Per-tenant admin can configure which tools their agents can execute

### Conversation state

- Resumable across sessions (user logs out, returns; conversation persists)
- Stored in tenant schema (per [D-33](../decisions/DECISIONS_LOG.md))
- Encrypted at rest where supported by cloud (RDS / Cloud SQL native encryption per [D-32](../decisions/DECISIONS_LOG.md))
- PII-scrubbed in observability traces (per [ADR-0006](./ADR-0006-observability.md))

### LLM Gateway integration

- All LLM calls in the orchestrator go through Gateway ([D-47](../decisions/DECISIONS_LOG.md))
- Per-skill model config per per-component LLM choice ([D-47](../decisions/DECISIONS_LOG.md)): a `classify_intent` skill might use Haiku 4.5; a `generate_response` skill might use Sonnet 4.6; an `escalation_decision` skill might use Opus 4.7
- Gateway provides cost attribution per skill (per [D-46](../decisions/DECISIONS_LOG.md))

## Considered alternatives

- **Custom orchestrator instead of LangGraph** — rejected: LangGraph is the de-facto orchestrator in 2026; mature; AI-introspectable; integrates with Langfuse per [D-46](../decisions/DECISIONS_LOG.md).
- **Mobile + telephonic surfaces MVP-1** — rejected: channel adapters are non-trivial and don't unblock the demo flow; v1 is the right pacing.
- **Subagent registry MVP-1** — rejected: multi-agent composition adds debugging complexity; single-agent + tool-calls covers most MVP-1 use cases.
- **No per-tenant graphs (one global graph)** — rejected: each tenant's product is different; per-tenant configurability matches D-33's tenant isolation philosophy.
- **Conversation state in `platform` schema** — rejected: violates D-33 (conversation data is tenant-scoped).

## Consequences

### Positive

- **MVP-1 ships a working customer-facing AI agent** — visible AI value at first deploy
- **LangGraph adoption** — leverages community / ecosystem; tracing into Langfuse per [D-46](../decisions/DECISIONS_LOG.md)
- **RBAC-scoped tool execution** prevents privilege escalation from agent surfaces
- **Per-tenant configurability** — adopters customize agent behavior per tenant without code changes
- **Conversation state resumable** — better UX than session-bound chats

### Negative / accepted tradeoffs

- **MVP-1 ships only web surface** — adopters wanting mobile / telephonic wait for v1
- **LangGraph adoption ties us to its API stability** — mitigated by adapter wrapper that limits churn surface
- **Per-skill LLM configuration adds adopter setup cost** — mitigated by sensible kit defaults
- **Multi-agent composition delayed to v1** — single-agent flows must cover MVP-1 use cases

### Cross-cutting

- [ADR-0008](./ADR-0008-customer-profile-builder.md) (Sub 1) — agent reads profiles for personalization
- [ADR-0009](./ADR-0009-context-resolving-query.md) (Sub 2) — agent uses Context Query for retrieval
- [ADR-0011](./ADR-0011-llm-gateway.md) (Sub 4) — all LLM calls through Gateway
- [ADR-0017](./ADR-0017-status-brand-admin.md) — admin UI may surface agent management v1+
- [ADR-0029](../decisions/DECISIONS_LOG.md) — `packages/ai-ui` provides the UI shell + widget primitives

## Implementation notes

- `packages/ai-agent-platform` — orchestrator core + skills / tools / widgets registries + per-tenant config
- `packages/ai-agent-channels-web` — web channel adapter (MVP-1)
- `packages/ai-agent-channels-mobile` — React Native adapter (v1)
- `packages/ai-agent-channels-telephonic` — Twilio / Vonage adapter (v1+)
- LangGraph state lives in tenant `agent_graphs` table; runtime state ephemeral in process memory + observability spans
- Conversation persistence via Drizzle in tenant schema

## Revisit triggers

- **LangGraph stability issues** → swap to custom orchestrator; adapter pattern limits blast radius
- **Telephonic adopter demand** → promote v1+ to v1
- **Multi-agent composition critical for adopter** → promote subagent registry from v1 to MVP-1+
- **Tool execution privilege escalation issues** → tighten RBAC; revisit role granularity
- **Conversation data scale** → consider archival strategies / external object storage
