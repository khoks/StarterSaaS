# ADR-0009 — AI Subsystem 2: Context-Resolving Query Service

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)

---

## Context

Per RAW_VISION:

> "Then there has to be another AI system which can be used by any of the AI agents in the SAS Enterprise or any of the non AI agent features as well... when it is called with a natural language query it will basically go and figure out what data has to be fetched from which of the transactional data warehouse or AI native store system how it has to be fetched et cetera and then it will give it back to its client... developers don't know how to supply data to these prompts to these AI agents for personalization or for their basic execution. So this second AI system will know how to get the data what data to get and where to get it from in the SAS enterprise."

This ADR locks the architecture for that service.

Constraints:

- [D-32](../decisions/DECISIONS_LOG.md) Drizzle + Postgres for transactional
- [D-37](../decisions/DECISIONS_LOG.md) pgvector for semantic search
- [ADR-0008](./ADR-0008-customer-profile-builder.md) AI-native stores (Sub 1) for profiles
- [D-44](../decisions/DECISIONS_LOG.md) schema-per-tenant for permission filtering
- [D-47](../decisions/DECISIONS_LOG.md) LLM Gateway for all LLM calls
- [D-48](../decisions/DECISIONS_LOG.md) RBAC for fine-grained access control

## Decision

### Phase fit

| Component | Phase |
|---|---|
| Foundation: LLM Gateway + AI-native stores (Sub 1) | **MVP-1** (already shipping) |
| 3-layer pipeline + plan/result caching + audit log | **v1** |
| Adopter custom data sources via plugins | **v1+** |

### 3-layer pipeline

```text
Caller (AI agent or non-AI feature) — invokes resolveContext({query, context, schemaHint?})
    ↓
1. PLAN
   Planner LLM (Sonnet 4.6 default per D-47)
   Input: NL query + caller context + schema introspection (data graph)
   Output: Zod-validated execution plan (sequence of typed steps)
   Plan cache: (tenant, query_hash, schema_version)
    ↓
2. EXECUTE
   Run plan steps:
     - SQL queries against tenant transactional schema (D-32)
     - Vector searches against pgvector (D-37)
     - AI-native store lookups (Sub 1 profiles)
     - Platform schema queries (e.g., RBAC, billing, observability)
   Permission-filtered: active tenant + RBAC (D-48)
   Result cache: (tenant, query_hash, 5-min-bucket) default
    ↓
3. SYNTHESIZE
   Combine results into typed structured context object
   Synthesis LLM only when caller asks for NL summary
   Otherwise: raw structured data
    ↓
Returns ContextResult to caller
```

### Plan structure (Zod-validated)

```typescript
const PlanSchema = z.object({
  reasoning: z.string(),         // Why these steps (audit + debug)
  steps: z.array(z.discriminatedUnion('kind', [
    SqlStepSchema,               // SQL query template + params
    VectorSearchStepSchema,      // pgvector similarity query
    ProfileLookupStepSchema,     // AI-native store lookup (Sub 1)
    PlatformQueryStepSchema,     // Platform schema query (RBAC/billing/obs)
  ])),
  synthesis: z.discriminatedUnion('kind', [
    z.object({kind: 'raw'}),
    z.object({kind: 'nl_summary', tone: z.enum(['terse', 'verbose'])}),
    z.object({kind: 'typed_object', schema: z.string()}),
  ]),
});
```

### Schema introspection (planner's "data graph" context)

The planner LLM is given:

- Transactional schema (extracted from Drizzle definitions)
- AI-native store schemas (from [ADR-0008](./ADR-0008-customer-profile-builder.md) profile types)
- Platform schemas (`platform.tenants`, `platform.audit_log`, `platform.observability_events`, etc.)
- Index info for each table (which columns are indexed; pgvector indexes)
- Row-count hints (for cost estimation)

Auto-extracted at boot from kit packages and tenant schemas; refreshed on schema migration ([D-44](../decisions/DECISIONS_LOG.md) trigger).

### Permission filtering

Critical: **filtering happens at the EXECUTE layer**, not synthesize.

- Each step is rewritten to include `WHERE tenant_id = $active_tenant`
- Cross-tenant queries blocked by construction
- RBAC: each step checks if the active user has `read` permission for the targeted entity type
- Synthesis sees only the filtered results — cannot leak cross-tenant data even via creative prompt construction

### Caching

| Cache | Key | TTL default | Invalidation |
|---|---|---|---|
| Plan cache | `(tenant, query_hash, schema_version)` | indefinite | schema migration ([D-44](../decisions/DECISIONS_LOG.md)) bumps `schema_version` |
| Result cache | `(tenant, query_hash, 5-min-bucket)` | 5 min default (configurable) | time-based; manual invalidate on relevant entity update event |

### Audit log

`platform.context_query_audit`:

```text
id, tenant_id, caller (agent_id | feature_id), query, plan_hash, result_hash,
  duration_ms, cost_usd (sum of LLM + DB), created_at
```

Surfaced in observability dashboards; used by [ADR-0012](./ADR-0012-ai-coworker-internal-ops.md) for system-health diagnosis.

## Considered alternatives

- **Single LLM call (no 3-layer)** — rejected: putting structured data fetching inside the LLM means the LLM hallucinates table names and joins; structured fetching needs deterministic execution.
- **Pure SQL agent (text-to-SQL)** — rejected: SQL alone misses vector search and profile lookups; planner must reason across multiple data sources.
- **Plan caching by query embedding similarity** — considered; rejected for MVP-1: similarity-based plan reuse risks subtle correctness bugs (semantically-similar but materially-different queries getting wrong plans). Exact `query_hash` is safer; can add semantic plan reuse v1+ if measured cost-savings justify.
- **No result cache (fresh every call)** — rejected: hot queries hit data layer hard; 5-min default is a reasonable freshness/cost trade.
- **Permission filter at synthesis layer** — rejected: by construction, the LLM should never see cross-tenant data; filtering at execute is the safe boundary.

## Consequences

### Positive

- **Solves "developers don't know what data to supply to prompts"** — the user's stated pain point
- **Multi-tenant safe by construction** — execute-layer permission filter
- **AI-introspectable plan structure** — feeds [D-23](../decisions/DECISIONS_LOG.md) AI-validated plugin compatibility
- **Reusable across AI agents and non-AI features** — same service, same contracts

### Negative / accepted tradeoffs

- **Planner LLM cost adds up** — mitigated by plan caching + cheap default model (Sonnet 4.6)
- **Schema introspection at boot adds startup latency** — mitigated by caching the data graph; refresh only on migration
- **3-layer pipeline = 2-3 LLM calls in worst case** — observable via [D-46](../decisions/DECISIONS_LOG.md) cost dashboards; adopters see hot queries
- **Plan cache invalidation on schema migration is correct but coarse** — every adopter migration evicts all plans; mitigated by per-tenant migration discipline (D-44)

### Cross-cutting

- [ADR-0008](./ADR-0008-customer-profile-builder.md) (Sub 1) — provides AI-native stores this service queries
- [ADR-0010](./ADR-0010-agent-platform.md) (Sub 3) — agents call this service for context enrichment
- [ADR-0011](./ADR-0011-llm-gateway.md) (Sub 4) — all 3 layers go through Gateway
- [ADR-0006](./ADR-0006-observability.md) — audit log surfaced in dashboards

## Implementation notes

- `packages/ai-context-query` — service + planner + executor + synthesizer
- Planner prompt template lives in `packages/ai-context-query/src/prompts/planner.ts` with versioning for adopter customization
- Schema introspector lives in `packages/ai-context-query/src/schema-introspector/` — extracts from Drizzle + adopter custom tables + AI-native profiles
- Permission filter logic in `packages/ai-context-query/src/exec/permissions.ts` — middleware-style; intercepts every step

## Revisit triggers

- **Plan cache hit rate is low** → revisit cache key strategy; consider semantic-similarity plan reuse
- **Planner LLM cost is high** → migrate planner to fine-tuned smaller model
- **Adopter requests federated queries across external DWs** → add data source plugin v1+
- **Permission filter overhead is measurable** → consider plan-time pre-filtering instead of runtime per-step filter
