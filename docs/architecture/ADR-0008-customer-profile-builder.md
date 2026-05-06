# ADR-0008 — AI Subsystem 1: Event-driven Customer Profile Builder + AI-Native Stores

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)

---

## Context

[D-15](../decisions/DECISIONS_LOG.md) named AI Subsystem 1 as foundational to the AI-first claim: every event in the kit (UI clickstream, entity events from the event bus, crucial API calls) feeds an AI system that builds per-customer / per-tenant profiles continuously.

Per RAW_VISION:

> "all these events will have to be consumed by an AI system which will [build] the custom Enterprise usage profile ... it will start building the customer's business profile ... AI chatbot interaction profile ... custom session level memories Feature usage memories at a feature level etc"

Constraints:

- [D-32](../decisions/DECISIONS_LOG.md) Drizzle + Postgres + [D-37](../decisions/DECISIONS_LOG.md) pgvector — embeddings live in same DB
- [D-33](../decisions/DECISIONS_LOG.md) schema-per-tenant — profiles live per-tenant
- [D-45](../decisions/DECISIONS_LOG.md) event bus — ingestion via consumer groups
- [D-47](../decisions/DECISIONS_LOG.md) LLM Gateway — all embedding calls go through it
- [D-15](../decisions/DECISIONS_LOG.md) phase fit — Sub 1 is **v1**; foundation MVP-1

## Decision

### Phase fit

| Component | Phase |
|---|---|
| Foundation: event bus + pgvector + LLM Gateway | **MVP-1** (already shipping) |
| Profile builder consumer + 5 default profile types | **v1** |
| Adopter-extensibility (custom profile types) | **v1** |
| Re-embedding migration tool | **v1** |
| Cross-tenant analytics rollups | **v2+** |

### Architecture

```text
Event bus (D-45)
    ↓
Per-tenant consumer group: "customer-profile-builder"
    ↓
Profile router (decides which profile type(s) to update per event type)
    ↓
For each affected profile:
  1. Fetch current profile from tenant_xyz.profiles_<type>
  2. Apply event delta (structured fields + decision: re-embed?)
  3. If re-embed: call LLM Gateway (D-47) → embedding model per D-36
  4. UPDATE profile row (incremental; same partition_key as event)
```

### 5 default profile types (MVP-defined; adopters extend)

| Profile type | Schema sketch | Update trigger | Retention default |
|---|---|---|---|
| `usage_profile` | feature-touch counts, depth metrics, last-active timestamps, identified workflows | every business event | 365 days |
| `business_profile` | firmographic data + behavioral signals (industry, size, plan tier, subscription state) | onboarding + plan changes + monthly snapshot | indefinite |
| `interaction_profile` | AI chatbot conversation embeddings + intent history + satisfaction signals | every chatbot turn | 365 days |
| `session_memory` | per-session ephemeral state (current goal, scratchpad, partial inputs) | every action in session | 90 days |
| `feature_memory` | per-feature long-term preferences and patterns | on feature interaction | 365 days |

Each profile type:

- Lives in `tenant_xyz.profiles_<type>` (per [D-33](../decisions/DECISIONS_LOG.md))
- Has a Zod schema in `packages/ai-profile-builder/src/profile-types/<type>.ts` (per [D-25](../decisions/DECISIONS_LOG.md))
- Has structured columns + an `embedding` vector column (pgvector per [D-37](../decisions/DECISIONS_LOG.md))
- Adopter-tunable retention; old profiles soft-archived then hard-deleted

### Adopter extensibility

```typescript
// In adopter's starter.config.ts
ai: {
  profileTypes: {
    custom_industry_profile: {
      schema: customIndustryProfileSchema,  // Zod
      updateOn: ['order.placed', 'support.ticket.opened'],
      embedding: { trigger: 'debounced', windowMs: 60000 },
      retention: { days: 730 },
    },
  },
}
```

Custom profile types get their own `tenant_xyz.profiles_custom_industry_profile` table; same pattern as defaults.

### Embedding strategy

| Trigger | When |
|---|---|
| `every-event` | Re-embed on every update; high cost, freshest |
| `batched` | Buffer N events or T seconds, then re-embed |
| `debounced` | Re-embed only after a quiet window |
| `manual` | Adopter-controlled re-embed (e.g., scheduled job) |

Default per-profile-type configurable; pick `debounced` for MVP-1 defaults to balance cost.

### Re-embedding migration

When the embedding model changes (e.g., `text-embedding-3-small` → `text-embedding-3-large` per [D-36](../decisions/DECISIONS_LOG.md)), all stored vectors must be regenerated. v1 ships a migration tool:

- `npx @starter-saas/cli ai re-embed --profile-type=usage_profile --tenant=<id> [--all]`
- Uses saga primitives ([D-45](../decisions/DECISIONS_LOG.md)) for resumable per-tenant per-type re-embedding
- Drizzle-kit migration adds the new vector column; old column dropped after migration completes

### Permission model

- All profile reads / writes go through tenant-scoped middleware (per [D-44](../decisions/DECISIONS_LOG.md))
- Cross-tenant profile queries are not supported MVP-1 (v2+ via aggregation rollups in `platform.observability_events`)
- Profile data is treated as PII — full PII scrubbing rules from [ADR-0006](./ADR-0006-observability.md) apply

## Considered alternatives

- **Centralized cross-tenant profile store** — rejected: violates D-33 isolation; cross-tenant queries belong in platform schemas (per [D-44](../decisions/DECISIONS_LOG.md) cross-schema query primitives).
- **Batch (nightly) profile rebuild instead of streaming** — rejected: defeats real-time AI personalization; streaming via event bus is cheap on top of D-45.
- **Profiles as event sourcing (append-only)** — rejected for MVP-1: more complex; can be added v1+ as an alternative storage strategy if event-replay benefit emerges.
- **Profiles in their own dedicated DB (e.g., DynamoDB / MongoDB)** — rejected: adds storage engine; D-32 + D-37 cover the requirement.
- **Hardcoded profile types (no adopter extensibility)** — rejected: industry-specific profiles are real; extensibility is cheap.

## Consequences

### Positive

- **AI-native data foundation MVP-1** — pgvector + event bus + LLM Gateway ready before Sub 1 ships v1
- **Multi-tenant safe by construction** — schemas-per-tenant means no cross-tenant leakage
- **Adopter-extensible** — industry-specific profile types via config
- **Re-embedding migration is a first-class operation** — embedding model upgrades don't strand data

### Negative / accepted tradeoffs

- **Streaming profile updates can be expensive at high event rates** — mitigated by debounced/batched embedding triggers and cost dashboards from [D-46](../decisions/DECISIONS_LOG.md)
- **Profile schema migrations are per-tenant** — must run via [D-44](../decisions/DECISIONS_LOG.md) tenant-migration runner; tested in dev before adopting
- **Re-embedding is expensive and slow at scale** — mitigated by saga-based resumable migration

### Cross-cutting

- [ADR-0009](./ADR-0009-context-resolving-query.md) (Sub 2) reads profiles to enrich context for callers
- [ADR-0010](./ADR-0010-agent-platform.md) (Sub 3) consumes profiles for personalized agent responses
- [ADR-0011](./ADR-0011-llm-gateway.md) (Sub 4) — every embedding call goes through Gateway
- [ADR-0012](./ADR-0012-ai-coworker-internal-ops.md) (Sub 5) can query architecture registry to surface profile-builder health

## Implementation notes

- `packages/ai-profile-builder` — consumer + router + 5 default profile types + Zod schemas
- Profile router is a switch on event topic → list of profile types affected; configurable per adopter
- Re-embed orchestration via `packages/saga` (D-45) for resumability
- Embedding-model-version stored per-row to detect model drift

## Revisit triggers

- **High event volume strains DB** → consider partitioned profile tables; consider promoting to dedicated profile DB
- **Cross-tenant analytics demand** → design rollup ADR (out of MVP-1 scope today)
- **Privacy-sensitive industries (healthcare / finance)** → consider per-tenant encrypted profiles
- **Profile drift accuracy** → add evaluation suite per [D-47](../decisions/DECISIONS_LOG.md) eval framework
