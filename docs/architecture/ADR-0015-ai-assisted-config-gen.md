# ADR-0015 — AI-assisted config generation mechanism

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)

---

## Context

[D-22](../decisions/DECISIONS_LOG.md) locked **AI-assisted config generation** as MVP-1: the first engineer describes the SaaS in natural language ("I'm building a tutoring marketplace, need auth + payments + RBAC for teachers/students/admins, email notifications, basic analytics"); AI Subsystem 5 generates a starting `starter.config.ts` + suggests adapter picks + scaffolds the thin-shell folder layout. Day-1 demo time drops from ~30 minutes (manual config edit) to ~5 minutes.

This ADR locks the mechanism. Builds on [D-22](../decisions/DECISIONS_LOG.md), [D-25](../decisions/DECISIONS_LOG.md) (Zod schemas everywhere), [ADR-0012](./ADR-0012-ai-coworker-internal-ops.md) (architecture registry — for adapter catalog), [D-35](../decisions/DECISIONS_LOG.md) (Opus 4.7 kit-default for AI assistance), [D-47](../decisions/DECISIONS_LOG.md) (LLM Gateway).

## Decision

### Trigger

`npx @starter-saas/cli init --ai-assist`

Or as the entry point in [D-43](../decisions/DECISIONS_LOG.md) deploy command portal: "Want me to generate `starter.config.ts` from a description?"

### Pipeline (NL → schema-validated config)

```text
1. PROMPT
   Engineer types NL description: "tutoring marketplace, auth + Stripe + RBAC for
                                   teachers/students/admins, email notifications,
                                   basic analytics, AWS deployment, ~10 tenants"
    ↓
2. LLM GENERATION (Opus 4.7 per D-35; goes through Gateway D-47)
   System prompt includes:
     - Current kit version's full Zod schema for starter.config.ts
     - Architecture registry (ADR-0012) adapter catalog
     - Persona context (D-13 founder's first engineer)
   Output: candidate starter.config.ts
    ↓
3. ZOD VALIDATION (D-25 boundary discipline)
   Parse candidate against config schema
    ↓
   ┌─ Valid → proceed to step 4
   └─ Invalid → REPAIR-AND-RETRY LOOP (max 3 attempts):
        Send Zod error + candidate back to LLM
        Request fix
        Re-validate
   After 3 failures → human-readable error + escape to manual edit
    ↓
4. ADAPTER VERIFICATION
   For each adapter referenced in config (auth provider, LLM provider, vector DB,
   cloud, status page, etc.):
     - Verify adapter exists in architecture registry
     - If not: replace with closest match + flag for engineer review
    ↓
5. ENGINEER-CONFIRMATION UX
   Show diff: current starter.config.ts (or empty for fresh init) vs generated
   Inline explanation per change ("I picked Auth.js because the persona is solo
   founder; if you have an enterprise SSO requirement, switch to WorkOS")
   Engineer approves explicitly → write file
   Engineer rejects → optional iteration with feedback
    ↓
6. SCAFFOLD
   For folders implied by the config (e.g., custom adapter slots), scaffold
   matching directories with placeholder files
```

### Hallucination guardrails

| Guardrail | Mechanism |
|---|---|
| **Schema validity** | Zod parser rejects invalid configs; repair-and-retry loop max 3 |
| **Adapter existence** | Architecture registry is the source of truth; LLM cannot invent adapter names |
| **Schema-version awareness** | LLM only generates against the kit version's schema; refuses on schema mismatch |
| **Field-level constraints** | Zod refinements catch impossible values (negative quantities, invalid URLs, etc.) |
| **Cross-field consistency** | Validation across multiple fields (e.g., "if cloud = aws, region must be aws region") |
| **Engineer confirmation required** | No silent apply; explicit approval gate |

### Schema-version awareness

```typescript
// Generation prompt header includes:
{
  kit_version: "0.4.2",
  config_schema_hash: "sha256:abc123...",
  adapter_catalog_hash: "sha256:def456...",
  generated_at: "2026-05-05T10:30:00Z",
}
```

If kit version differs at apply-time, regeneration is required (kit doesn't apply stale generated configs).

### Iteration loop

If engineer rejects the initial generation:

```text
Engineer: "No, also add multi-tenant billing with Stripe Connect for marketplace payouts"
   ↓
LLM regenerates with updated context
   ↓
New diff presented
   ↓
Engineer approves OR iterates again
```

Up to 5 iteration rounds (configurable); after that, escape to manual edit.

### Side picks (locked)

| Setting | Default | Adopter-tunable? |
|---|---|---|
| Max repair-and-retry attempts | 3 | Yes |
| Max iteration rounds | 5 | Yes |
| LLM model for generation | Opus 4.7 (per D-35) | Yes (per-feature LLM choice per D-47) |
| Generation history retention | 90 days in `platform.config_gen_history` | Yes |
| Inline explanation requirement | Always shown — required engineer-trust UX | No |

## Considered alternatives

- **No engineer-confirmation gate (silent apply)** — rejected: trust ladder is the wrong direction; D-13 persona will trust AI more after seeing it work
- **Full plugin discovery via web crawl (LLM finds new adapters online)** — rejected for MVP-1: scope; v1+ if adopter demand
- **Multi-prompt chain (initial → adapter selection → security review → ...)** — considered; rejected for MVP-1: single-prompt with structured guardrails is simpler and adequate
- **Form-based UI instead of NL** — considered; rejected: fights the "describe-in-English" promise; form-builder is v1+ UX option

## Consequences

### Positive

- **Day-1 demo time compressed from 30 minutes to ~5 minutes** — direct win for D-13 persona
- **AI-first credibility from minute 1** — first engineer sees AI value in their first kit interaction
- **Hallucination-free by construction** — schema + registry are sources of truth; LLM cannot invent
- **Iteration loop matches real-world product brainstorming** — first pass rarely captures everything

### Negative / accepted tradeoffs

- **LLM call cost per init** — bounded; prompt caching ([D-38](../decisions/DECISIONS_LOG.md)) makes it cheap on retries
- **Schema-version coupling** — LLM must match exact kit version; mitigation: strict version checks
- **Engineer must learn to write good NL prompts** — kit ships example prompts in docs

### Cross-cutting

- [ADR-0012](./ADR-0012-ai-coworker-internal-ops.md) — architecture registry is the adapter catalog
- [ADR-0011](./ADR-0011-llm-gateway.md) — generation calls go through Gateway with cost tracking
- [ADR-0006](./ADR-0006-observability.md) — generation usage tracked in cost dashboards
- [D-43](../decisions/DECISIONS_LOG.md) — deploy command portal offers `--ai-assist` flag at deploy time too

## Implementation notes

- `packages/config-gen` — pipeline + LLM prompt templates + schema validator + diff renderer
- Generation history in `platform.config_gen_history` for audit + iteration learning
- Diff rendering uses the same primitives as deploy portal ([D-43](../decisions/DECISIONS_LOG.md))
- Iteration UI is part of `@starter-saas/cli init` flow; same primitives reusable in admin UI v1+

## Revisit triggers

- **Hallucination escapes guardrails** — adopter encounters generated config with invalid adapter name → tighten registry-cross-check
- **Engineer iteration count high** — typical engineer takes >3 rounds → revisit prompt design or model
- **Adopter requests form-based UX** — promote v1+ form-builder; keep NL as one of multiple paths
- **Multi-prompt chain becomes worth the complexity** — observability shows generation accuracy issues → split into staged prompts
