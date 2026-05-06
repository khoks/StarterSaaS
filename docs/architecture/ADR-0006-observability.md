# ADR-0006 — Observability stack (OTel foundation + cloud-native + Langfuse for LLM-specific)

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)
- **Supersedes:** (none)
- **Superseded by:** (none)

---

## Context

[D-38](../decisions/DECISIONS_LOG.md) committed **MVP-1** to AI cost dashboards + per-tenant LLM budgets + prompt caching + adopter-config-driven routing. [D-41](../decisions/DECISIONS_LOG.md) included per-cloud observability adapters in the cloud-resource architecture. [D-45](../decisions/DECISIONS_LOG.md) requires saga state, outbox depth, DLQ count surfaced as first-class metrics. [D-15](../decisions/DECISIONS_LOG.md) (AI-first) requires visible LLM metrics: token counts, costs, latency by provider, cache-hit rate.

This ADR closes those open questions across logs / metrics / traces / LLM-specific telemetry / cost dashboards / budget enforcement.

## Decision

### Foundation — OpenTelemetry (OTel) with GenAI semconv

| Telemetry type | Tool | Notes |
|---|---|---|
| **Logs** | Pino → OTel Logs Bridge | TS-native, fast, structured JSON |
| **Metrics** | OTel SDK + Prometheus-compatible export | Per-tenant cardinality controlled |
| **Traces** | OTel SDK + auto-instrumentation for Fastify + Drizzle + Pulumi | Standard application traces |
| **GenAI traces** | **OTel GenAI semantic conventions** | `gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.{input,output,cache_read}_tokens`, `gen_ai.response.id`, etc. |

OTLP wire protocol; vendor-agnostic backend; fits the [D-16](../decisions/DECISIONS_LOG.md) adapter pattern. Adopting OTel GenAI semconv from day 1 means: cost dashboards work with any OTLP backend that understands them; vendor swap is configuration-only.

### Backends — MVP-1 + v1+

| Backend | Phase | Notes |
|---|---|---|
| **AWS CloudWatch + X-Ray** | MVP-1 (when `cloud: aws`) | Cloud-native; zero additional deploy |
| **GCP Cloud Logging + Cloud Trace + Cloud Monitoring** | MVP-1 (when `cloud: gcp`) | Cloud-native; zero additional deploy |
| **Langfuse** | **MVP-1, runs alongside cloud-native** | LLM-specific deep-dive — agent flows, LangGraph node tracing, prompt-response capture, eval framework |
| Self-hosted Grafana stack (Grafana + Loki + Tempo + Mimir) | v1+ | Vendor-neutral OSS; for adopters not wanting cloud-native lock-in |
| Datadog | v1+ | Premium adopter target |
| New Relic | v1+ | |
| Honeycomb | v1+ | Specifically strong for LLM-trace deep-dive |

**Two-headed observability for LLM calls** (MVP-1):

- **OTel** captures general application traces (request → DB → response) including GenAI spans
- **Langfuse** captures LLM-specific deep-dive: full prompt + response (subject to PII scrubbing), agent decision trees, eval results

Cost: doubled telemetry per LLM call. Mitigation: adaptive sampling (below).

Adopter declares in `starter.config.ts`:

```typescript
observability: {
  general: { backend: "cloudwatch" | "grafana" | "datadog" | ... },
  llm: { backend: "langfuse", deployment: "self-hosted" | "cloud" },
  sampling: { error_rate: 1.0, healthy_rate: 0.01 },
  pii_scrub: { enabled: true, ... },
  retention: { logs_days: 30, traces_days: 7, metrics_days: 90, cost_rollups_days: 90 },
}
```

### Cost dashboard (MVP-1, per D-38)

Themed React admin dashboard at `/admin/observability` (post-auth, RBAC-gated to platform admins). Lives in `apps/starter/`; themed via `@starter-saas/brand`.

**Breakdowns:**

- Per-provider spend (stacked bar: Anthropic / OpenAI / Ollama-self-hosted)
- Per-tenant spend (top-N tenants table + drill-down)
- Per-feature spend (which kit AI features burned how much)
- Per-time-period (hour / day / month / custom range)
- Budget consumed % per tenant (red / yellow / green threshold viz)
- Cache hit rate (Anthropic prompt caching effectiveness)
- Token-distribution histogram (catch outlier prompts)

**Storage:** `platform.observability_events` (rolled up by an event-bus consumer reading `platform.llm_call` topic per [D-45](../decisions/DECISIONS_LOG.md)). Retention: 90 days hot + archive (adopter-tunable).

### Per-tenant LLM budget enforcement (MVP-1, per D-38)

`platform.tenant_budgets` table:

```text
tenant_id          uuid
period             "monthly" | "daily" | "hourly"
limit_usd          numeric
soft_threshold_pct numeric  default 80
hard_enforce       boolean  default true
exempt_features    text[]   features bypassing budget (e.g., critical health checks)
```

- **Soft threshold (80% default)** → emits warning event; surfaces in dashboard; sends notification per adopter config
- **Hard limit (`hard_enforce: true`)** → LLM calls return `BUDGET_EXCEEDED`; consumers handle gracefully (cache fallback / queue for next period / fail user-visible feature with helpful message)

Adopter sets defaults in `starter.config.ts → observability.budgets: { default: { period: "monthly", limit_usd: 100, soft_threshold_pct: 80 } }`; per-tenant overrides via admin UI / API.

### Side picks (locked)

| Setting | Default | Adopter-tunable? |
|---|---|---|
| Trace sampling — error path | 100% | Yes |
| Trace sampling — healthy path | 1% (adaptive) | Yes |
| PII scrubbing | **Required by default** at MVP-1 | Yes (off in dev only) |
| LLM prompt logging | Token counts + first/last 100 chars + content hash | Adopter can opt into full prompt logging in dev |
| Logs retention | 30 days | Yes |
| Traces retention | 7 days | Yes |
| Metrics retention | 90 days | Yes |
| Cost rollup retention | 90 days hot + archive | Yes |
| Default alerts shipped | Deploy failure, saga DLQ growth, budget breach, error rate spike | Adopter customizes via webhook |
| Dashboard storage | TS code in `packages/observability-dashboards` | Adopter can fork |

### Package shape

- **`packages/observability`** with sub-modules: `pino`, `otel-genai`, `cost-rollup-consumer`, `budget-enforcer`, `dashboards`
- **`packages/observability-dashboards`** — dashboard-as-code (TS); adopters fork
- **Adapter packages per backend** — `@starter-saas/observability-cloudwatch`, `@starter-saas/observability-cloud-logging`, `@starter-saas/observability-langfuse`, `@starter-saas/observability-grafana` (v1+), etc.

## Considered alternatives

- **Vendor SDK directly (Datadog SDK / New Relic SDK / etc.) instead of OTel** — rejected: locks adopters into one vendor; can't swap without rewriting instrumentation.
- **Single-backend MVP-1 (cloud-native only, no Langfuse)** — rejected: OTel GenAI semconv is generic; Langfuse is purpose-built for LLM-app deep-dive (agent flows, prompt inspection, eval). LLM-app teams need both.
- **Single-backend MVP-1 (Langfuse only)** — rejected: Langfuse doesn't replace general application observability; cloud-native covers that domain better at MVP-1 scale.
- **Self-hosted Grafana stack as MVP-1 default** — rejected: adopter must run Grafana + Loki + Tempo + Mimir at deploy time (heavier first-deploy than cloud-native managed); v1+ adapter is the right pacing.
- **No PII scrubbing by default** — rejected: GDPR-friendly defaults matter; D-13 persona may not realize the legal exposure of full prompt logging.
- **Full prompt logging by default** — rejected: same as above; opt-in for dev is the right ergonomics.
- **High sampling rate (100% on healthy path)** — rejected: cost-prohibitive at adopter scale; 1% adaptive is the industry default.

## Consequences

### Positive

- **Vendor-agnostic foundation** — OTel + GenAI semconv works with any OTLP-compatible backend.
- **Zero-additional-deploy at MVP-1** — cloud-native default uses D-41 cloud resources.
- **Langfuse parity from day 1** — LLM-app teams get the deep-dive tooling they expect.
- **Cost dashboard ships MVP-1** — adopter has visible AI cost breakdown without any vendor signup.
- **Per-tenant budget enforcement ships MVP-1** — protects adopters from surprise bills.
- **GDPR / privacy-friendly by default** — PII scrubbing required; full prompts not logged.

### Negative / accepted tradeoffs

- **Two observability heads doubles per-call telemetry cost** — mitigated by adaptive sampling (1% healthy paths).
- **OTel GenAI semconv still maturing** — some attributes may evolve; mitigated by adapter-version pinning + documented upgrade path.
- **Cloud-native default ties observability to cloud target** — adopter swapping clouds (AWS → GCP) loses historical data unless they migrate it. Mitigated: Grafana adapter v1+ for vendor-neutral.
- **Default alerts may not fit every adopter** — kit ships sensible defaults; adopter customizes.
- **PII scrubbing is incomplete** — automated scrubbing catches known patterns but can miss novel ones; adopter's own validation matters.

### Cross-cutting

- **ADR-0011 (LLM Gateway)** integrates with this stack — Gateway emits OTel GenAI spans + Langfuse traces + cost-event publishes to event bus.
- **ADR-0007 (auth)** integrates with RBAC for dashboard access control.
- **ADR-0014 (AI-assisted upstream merge)** uses observability data to evaluate merge confidence (low-confidence merges produce telemetry; high-confidence merges checked against baseline).
- **D-43 (deploy command portal)** uses LLM Gateway → Langfuse for AI narration tracing.

## Implementation notes

- **Pino → OTel Logs Bridge** via `@opentelemetry/api-logs`; structured JSON written stdout in dev, OTLP in prod.
- **OTel auto-instrumentation** registered at app boot — Fastify, Drizzle (postgres), Pulumi (deploy-time), HTTP clients.
- **Langfuse SDK** integrated in `@starter-saas/llm-gateway` (per ADR-0011) — every LLM call gets a Langfuse trace alongside the OTel span.
- **Cost rollup consumer** runs in `packages/observability/cost-rollup-consumer` — subscribes to `platform.llm_call` topic; rolls up to `platform.observability_events` with `(tenant_id, feature_id, provider, period)` aggregations.
- **Budget enforcer** runs as middleware in `@starter-saas/llm-gateway` (per ADR-0011) — checks `platform.tenant_budgets` before issuing LLM call.
- **Default dashboards** ship as React components in `packages/observability-dashboards`; adopter forks via shadcn-pattern.
- **PII redactor** is a Pino transformer + OTel attribute filter; matches known sensitive keys (passwords, API keys, full email, SSN, credit card, phone numbers); LLM prompts get partial logging.

## Revisit triggers

- **Langfuse acquisition / abandonment** — community shrinks → swap to LangSmith / OpenLLMetry / similar; may bump to v1+ alongside Grafana.
- **OTel GenAI semconv breaking changes** — pin SDK version; upgrade per release notes; document migration if needed.
- **Cost dashboard scope grows** — adopters request finer breakdowns or different visualizations → new dashboard cards added; consider promoting to its own ADR if scope balloons.
- **Per-tenant budget evasion** — feature-exemption list grows; revisit governance.
- **Adopter request for vendor X** (Splunk, Sumo, Loggly, etc.) → add adapter; estimate cost.
- **PII scrubbing false positives or false negatives** — refine pattern library; add adopter-specific rules.
