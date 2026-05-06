# ADR-0011 — LLM Gateway: policy enforcement point + observability choke point (NOT a routing brain)

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)
- **Supersedes:** (none)
- **Superseded by:** (none)

---

## Context

[D-15](../decisions/DECISIONS_LOG.md) named **AI Subsystem 4 — LLM Gateway + Safety + Model Hub + Eval/Cost** as foundational MVP-1. The original framing positioned the Gateway as the central point for all LLM calls in the kit. This ADR fleshes out the Gateway's responsibilities — and locks one critical design refinement raised by the user during STORY-009 Q3:

**The Gateway is a policy enforcement point and observability choke point — NOT a routing brain.** Provider / model selection happens at the **capability / component** level. Each kit feature, agent, or capability declares its preferred provider + model in its own config; the Gateway intercepts the call and applies cross-cutting policy.

This refinement reframes [D-35](../decisions/DECISIONS_LOG.md) (Opus 4.7 as kit-default for AI-assistance features) as a **feature-level default** for D-17 / D-22 / D-23 specifically, NOT a Gateway-level default. Similarly [D-38's](../decisions/DECISIONS_LOG.md) "adopter-config-driven routing" becomes per-feature config, not a Gateway global rule.

## Decision

### Gateway role: cross-cutting policy + observability

The Gateway intercepts every LLM call to apply policy. It does NOT make routing decisions. The four components from [D-15](../decisions/DECISIONS_LOG.md) Sub 4:

#### 1. Gateway core

- Request interception
- Span emission with OTel GenAI semantic conventions per [ADR-0006](./ADR-0006-observability.md)
- Langfuse trace emission (LLM-specific deep-dive)
- Cost-event publish to event bus per [ADR-0005](./ADR-0005-event-bus.md) (`platform.llm_call` topic; `partition_key: tenant_id`)
- Header propagation (correlation_id / trace_id / saga_id flow through to provider call where supported)

#### 2. Safety layer

Pre-call filters (input scrubbing):

- **PII / PCI scrubbing** on prompts — emails, phone numbers, SSNs, credit cards, full names (when detected); configurable per-tenant via `starter.config.ts`
- **Prompt injection detection** — known-pattern + heuristic + optional LLM-based classifier
- **Profanity / illegal-advice / toxicity filtering** — pluggable; default uses OpenAI Moderation API or Anthropic-recommended classifier; adopter can swap
- **Bias detection** (best-effort) — flag prompts that load on demographic attributes; surface to adopter
- **Output schema validation** when caller declares a Zod schema — invalid outputs flagged + retried

Post-call filters (output scrubbing):

- **Same PII / PCI checks on responses** (model could leak)
- **Profanity / illegal-advice on outputs**
- **Hallucination signals** (when measurable, e.g., contradicts source-of-truth context)

All filters configurable per-tenant; adopter sets defaults in `starter.config.ts → llm.safety: { ... }`.

#### 3. Model Hub

- **Registry of available providers + models** — Anthropic / OpenAI / Ollama for MVP-1 ([D-34](../decisions/DECISIONS_LOG.md))
- **Adopter-hosted custom models** — adopter can register fine-tuned LLMs running in their VPC + a Gateway adapter routes calls to them
- **Latest-models metadata** — Gateway surfaces "newer Anthropic Sonnet just shipped" → adopter can opt in
- **Provisioned-throughput-request workflow** (v1+) — adopter requests dedicated capacity from a provider via Gateway-mediated workflow

#### 4. Eval / Cost

- **Eval framework hooks** — capture LLM call → optionally run an eval suite (Promptfoo / DeepEval / custom) → store results in `platform.eval_results` table
- **Cost tracking** — per-call cost computed from provider rate × tokens; aggregated by event-bus consumer (per ADR-0006)
- **Per-tenant budget enforcement** with hard / soft limits per [D-46](../decisions/DECISIONS_LOG.md) + [D-38](../decisions/DECISIONS_LOG.md)
- **Prompt caching** — Gateway leverages Anthropic prompt caching transparently when the active provider supports it

### Per-component provider / model selection (the user's refinement)

Each kit feature declares its preferred provider + model:

```typescript
// AI-assistance features (D-17 / D-22 / D-23) — default to Opus 4.7
const aiMergeFeature = {
  llm: {
    provider: "anthropic",
    model: "claude-opus-4-7",
    fallback: { provider: "anthropic", model: "claude-sonnet-4-6" },
  },
  // ...
};

// Embedding feature — uses text-embedding-3-small per D-36
const semanticSearchFeature = {
  llm: {
    provider: "openai",
    model: "text-embedding-3-small",
  },
};

// Conversational agent — picks per-skill
const customerSupportAgent = {
  skills: {
    intent_classification: { provider: "anthropic", model: "claude-haiku-4-5" }, // cheap
    response_generation:    { provider: "anthropic", model: "claude-sonnet-4-6" }, // balanced
    escalation_decision:    { provider: "anthropic", model: "claude-opus-4-7" }, // critical
  },
};
```

Adopter overrides via `starter.config.ts → features.<feature_id>.llm: { ... }`. The Gateway just routes the call to whatever provider/model the feature declared, applies its policy, observes, returns.

### Gateway request flow

```typescript
async complete(request: LLMRequest, context: CallContext): Promise<LLMResponse> {
  const { tenantId, featureId, sagaId } = context;

  // 1. Per-tenant budget check (D-46 + D-38)
  await this.budgetEnforcer.check(tenantId, request);

  // 2. Safety: pre-call filters
  const sanitized = await this.safety.scrubInput(request, { tenantId });
  await this.safety.detectInjection(sanitized);
  await this.safety.checkContent(sanitized);

  // 3. Resolve provider + model from request (caller declared)
  const provider = this.modelHub.getAdapter(request.provider);

  // 4. OTel GenAI span + Langfuse trace
  return this.tracer.withGenAISpan({tenantId, featureId, sagaId, request}, async () => {
    return this.langfuse.withTrace({...}, async () => {

      // 5. Call provider
      const result = await provider.call(sanitized, request.options);

      // 6. Safety: post-call filters
      const cleaned = await this.safety.scrubOutput(result, { tenantId });
      await this.safety.checkContent(cleaned);

      // 7. Schema validation (if caller declared)
      if (request.responseSchema) {
        request.responseSchema.parse(cleaned.content);
      }

      // 8. Cost event to bus (D-45) → ADR-0006 cost dashboard rollup
      await this.bus.publish({
        topic: 'platform.llm_call',
        partition_key: tenantId,
        payload: {
          tenantId, featureId, sagaId,
          provider: request.provider, model: request.model,
          tokens: cleaned.tokens, cost_usd: this.cost.compute(provider, cleaned.tokens),
          cache_hit_tokens: cleaned.tokens.cacheRead,
        },
      });

      // 9. Eval suite hook (if configured)
      if (request.evalSuite) {
        await this.eval.run(request.evalSuite, { request, response: cleaned });
      }

      return cleaned;
    });
  });
}
```

### Package shape

- **`packages/llm-gateway`** — Gateway core
- **`packages/llm-gateway-safety`** — Safety filters (pluggable)
- **`packages/llm-gateway-model-hub`** — Provider/model registry
- **`packages/llm-gateway-eval`** — Eval framework integration
- **Provider adapter packages** — `@starter-saas/llm-provider-anthropic`, `-openai`, `-ollama` (MVP-1); `-bedrock`, `-vertex`, `-azure-openai`, etc. (v1+)

## Considered alternatives

### Routing centralized in Gateway (the original framing)

**Rejected per user direction.** Centralized routing fights real-world feature diversity. An embedding call wants the cheapest fastest model; a code-merge agent wants the most capable; a classification call wants the most consistent. Gateway-as-router would either:

- Enforce one routing rule globally (loses per-feature optimization)
- Express per-feature routing in the Gateway (duplicates feature config; defeats encapsulation)

Per-component declaration keeps each feature's LLM config near its domain logic.

### No Safety layer at the Gateway

**Rejected.** Without Gateway-side safety, every feature would need its own PII / injection / profanity guards, creating compliance gaps. Centralizing safety as Gateway middleware gives correct-by-default behavior + a single audit point.

### Direct provider SDK calls (no Gateway)

**Rejected.** Loses observability uniformity, cost attribution, budget enforcement, and safety guarantees. Adopter can't enforce per-tenant policies without intercepting calls.

### Eval framework outside the Gateway

**Rejected at MVP-1.** Eval-at-call-time is most useful for production-call evaluation (regression detection, drift monitoring). Capturing it at the Gateway means every adopter gets eval-ready infrastructure without integration work. Standalone eval (offline batch) is supported but separate.

## Consequences

### Positive

- **Per-component LLM config matches real engineering reality** — features have different cost / quality / latency requirements; per-component declaration keeps decisions near their context.
- **Cross-cutting policy is centralized at the Gateway** — PII / PCI / safety / budget / cost / observability all happen at one chokepoint; no per-feature integration burden.
- **Adopter overrides per-feature** in `starter.config.ts` — they can tune cost vs. quality on a per-feature basis without rewriting feature code.
- **Eval framework integrated MVP-1** — gives the kit measurable AI-feature improvement over time; feeds [D-23](../decisions/DECISIONS_LOG.md) AI-validated plugin compatibility.
- **Provider adapter pattern** preserves [D-16](../decisions/DECISIONS_LOG.md) — adopters swap providers without rewriting features.
- **Industry-standard pattern** — Cloudflare Workers AI Gateway, AWS Bedrock guardrails, OpenAI Moderation API all sit at the call-site as policy, not as routers.

### Negative / accepted tradeoffs

- **Per-feature LLM config adds boilerplate** — every feature declares its provider + model. Mitigation: kit ships sensible defaults (D-35 for AI-assistance features, D-36 for embeddings); adopter only overrides when needed.
- **Single Gateway instance is a single point of failure** — mitigation: stateless Gateway; multi-instance deploy; Gateway failure is a hard failure (LLM calls don't bypass safety).
- **Safety filters can produce false positives** — legitimate prompts blocked by overly aggressive PII detection. Mitigation: per-tenant configurability; adopter can tune sensitivity; surface near-miss telemetry.
- **Eval framework cost** — every call may run eval if configured; cost-aware adopters disable except for sampled traffic.
- **Adopter-hosted custom-model registration adds complexity** — Gateway must support arbitrary endpoints. Mitigation: well-defined adapter spec; adopter writes a small adapter for their custom model.

### Cross-cutting

- **ADR-0006 (observability)** — Gateway is the integration point for OTel GenAI semconv + Langfuse + cost-event emission.
- **ADR-0005 (event bus)** — Gateway publishes `platform.llm_call` events; cost rollup consumer in `packages/observability` aggregates.
- **ADR-0004 (multi-tenancy)** — per-tenant budget enforcement uses `platform.tenant_budgets` table.
- **ADR-0008..0010 (other AI subsystems)** — all use the Gateway; the customer profile builder, context-resolving query, and agent platform all flow through it.
- **ADR-0014 (AI-assisted upstream merge)** — D-17 feature uses the Gateway for its Opus 4.7 calls; safety + cost + eval all apply.
- **ADR-0015 (AI-assisted config gen)** — D-22 feature uses the Gateway similarly.
- **ADR-0013 (plugin extension-point spec)** — plugin LLM calls flow through the Gateway, getting safety + budget enforcement automatically.

## Implementation notes

- **`packages/llm-gateway/src/index.ts`** exports the `LLMGateway` class.
- **`CallContext`** carries `tenantId`, `featureId`, optional `sagaId`, optional `userId` for attribution.
- **Provider adapter contract**: `call(request, options) → response` with provider-specific token / cache-read accounting.
- **Safety filters** are middleware: pluggable list of pre-call + post-call filters; adopter-config-driven order + enable/disable.
- **Model Hub registry** lives in memory (loaded from `starter.config.ts` at boot); custom models registered via `gateway.modelHub.register({ name, endpoint, adapter })`.
- **Eval suite hook** is an optional callback per call: `request.evalSuite = { ref: "merge-quality-v1", sampleRate: 0.1 }`.
- **Prompt caching** — Gateway sets `cache_control` headers transparently for Anthropic provider; passes through unchanged for others.

## Revisit triggers

- **Per-feature config burden grows** — adopters complaining about boilerplate → consider hierarchical defaults or feature-class presets.
- **Routing actually does need to be centralized** for some use case (e.g., compliance: "all calls in EU tenants must use EU-hosted providers") → add Gateway-side routing rules carefully without violating per-component principle (treat as policy, not preference).
- **Safety filter precision issues** — false positives or false negatives → refine filter library; add adopter-specific patterns.
- **Provider rate-limiting story** — multi-tenant adopter hit by per-account rate limits → introduce queue + retry layer at Gateway.
- **Eval framework adoption** — if adopters use the eval hook heavily, promote `packages/llm-gateway-eval` to its own ADR with eval-suite design.
- **Provisioned-throughput workflow** at v1+ — formalize as own ADR.
