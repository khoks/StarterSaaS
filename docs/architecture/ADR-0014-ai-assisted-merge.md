# ADR-0014 — AI-assisted upstream merge mechanism

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)

---

## Context

[D-17](../decisions/DECISIONS_LOG.md) locked **AI-assisted upstream merge** as a first-class MVP-1+ kit feature anchoring the AI-first + subscribe-to-upstream story. The agent detects upstream package updates, examines user customizations via adapter usage signatures, proposes a merge plan minimizing friction, tests the proposed merge against the user's test suite, and surfaces conflicts to a human only when AI confidence is low.

This ADR locks the mechanism. It builds on:

- [D-16](../decisions/DECISIONS_LOG.md) hybrid kit-promise: subscribe-to-upstream for kit packages, fork-once for the shell
- [ADR-0012](./ADR-0012-ai-coworker-internal-ops.md) AI Coworker + architecture registry
- [ADR-0013](./ADR-0013-plugin-spec-and-ai-compat.md) extension-point specs + compat methodology (same agent, different surface)
- [D-35](../decisions/DECISIONS_LOG.md) Opus 4.7 as kit-default AI-assistance LLM
- [D-38](../decisions/DECISIONS_LOG.md) prompt caching for cost relief

## Decision

### Trigger

`npx @starter-saas/cli upgrade [--target-versions=...] [--auto-apply]`

Or scheduled via cron / CI: detect new upstream versions of subscribed packages → run merge analysis → open PR with proposal.

### Phase fit

| Capability | Phase |
|---|---|
| Detection + proposal generation + test verification | **MVP-1** |
| Confidence scoring | **MVP-1** |
| Engineer-review-required mode (default) | **MVP-1** |
| Autonomous-mode toggle (auto-apply on high confidence) | **v1** |
| Auto-fix mode (LLM proposes patches for breaking changes) | **v1+** |

### Adapter usage signature extraction

For each kit package the user subscribes to, the agent extracts the user's customization signature from architecture registry ([ADR-0012](./ADR-0012-ai-coworker-internal-ops.md)):

```text
For package @starter-saas/auth (current 0.4.2 → target 0.5.0):
  - Adapter contracts implemented: 1 (CustomAuthProvider)
  - Extension points hooked: 3 (sign-in-hook v1.x, session-validate-hook v1.x, mfa-required-hook v1.x)
  - Type imports from package public surface: 12 symbols
  - Direct imports from package internals: 0 (good — no escape-hatch usage)
  - User-side overrides: 0 vendored-and-customized files
```

Signature shapes drive merge analysis: the agent knows exactly what the user touched.

### Merge plan generation

For each subscribed package being upgraded:

1. **Diff** — git diff between current version and target version of the package (kit-supplied, not user code)
2. **Categorize changes** — breaking / additive / refactor / docs / tests
3. **Cross-reference signature** — which changes affect the user's hooked surfaces?
4. **LLM analysis** — for changes that affect the user, LLM (Opus 4.7) analyzes:
   - Will the user's adapter / hook still compile against the new shape?
   - Will the semantics still match user expectations?
   - Are there idiomatic-update suggestions?
5. **Plan output** — structured JSON: per-affected-file recommendation (no-op / type-only update / behavior-changing update / breaking)

### Test-first verification

Before proposing the merge to the user:

1. Apply the merge plan in an isolated branch (`auto/upgrade-<run_id>`)
2. Run user's test suite against the merged code
3. Capture: pass/fail status per test, runtime errors, type errors
4. Report failures into the merge plan

Tests are the truth. AI confidence is calibrated against test outcomes.

### Confidence scoring methodology

| Score | Indicators | Default action |
|---|---|---|
| **High** (≥ 0.9) | All user tests pass + no type errors + signature-affected changes are additive only | Engineer notification + auto-merge if `autonomous-mode` toggle on |
| **Medium** (0.6–0.9) | Tests pass + type errors or behavior-changing additions in signature-affected paths | Engineer review (default) |
| **Low** (< 0.6) | Test failures OR type errors OR breaking changes in signature-affected paths | Engineer review required; LLM provides recommended fixes; PR labeled `needs-engineer` |

Confidence is computed per-change and aggregated to overall plan confidence (lowest of any change).

### Autonomous-mode toggle (v1)

Adopter can enable in `starter.config.ts`:

```typescript
upgrades: {
  autonomous: {
    enabled: true,
    minConfidence: 0.95,                  // adopter-tunable; default 0.95
    requireTestsPassing: true,
    notifyOnApply: ["#engineering-feed"], // Slack / Discord / email channels
    requireApprovalAfterDays: 7,          // safety net: stop auto-applying if no engineer reviewed in 7 days
  },
},
```

Even in autonomous mode, every auto-applied merge generates an audit entry + PR (with explanation) for engineer post-hoc review.

### Rollback / circuit-breaker behavior

- **Branch-based merges** — every merge attempt opens a feature branch; rejection / failure = branch deletion + restore previous state
- **Auto-applied merges** — captured in `platform.upgrade_history`; revert is one CLI command (`upgrade revert <run_id>`)
- **Circuit breaker** — if N consecutive auto-applied merges produce production incidents (signals from observability), autonomous mode halts and waits for engineer reset
- **Production canary path (v1+)** — autonomous mode promotes through staging → small-canary → full-deploy with observability gates between

### LLM cost management

- Per-package analysis is cached on kit-package version pair `(from_version, to_version)`
- Adopter customization context is dynamic but small (signature + hook bodies) — fits in prompt cache reliably
- Single upgrade run for a typical adopter touches 5–20 packages → ~20-50 LLM calls; cached after first
- Prompt caching ([D-38](../decisions/DECISIONS_LOG.md)) reduces marginal cost dramatically

## Considered alternatives

- **Pure diff-based merge (no AI)** — rejected: misses semantic changes; same reason ADR-0013 needs AI for plugin compat
- **AI without test-first verification** — rejected: tests are the ground truth; LLM confidence is probabilistic
- **External orchestrator (e.g., Renovate / Dependabot only)** — rejected: those tools don't understand kit extension-point semantics or adopter customization signatures
- **Auto-merge on green CI without confidence threshold** — rejected: green tests don't catch all behavior changes; confidence-gated autonomous mode is the safer pattern
- **No autonomous mode** — considered; rejected for v1: high-confidence auto-merge is the visible AI-first feature for kit-promise narrative

## Consequences

### Positive

- **Engineer "I don't want to maintain platform code" pain (D-13) directly addressed** — even staying current is automated
- **Subscribe-to-upstream story (D-16) becomes practically viable** — merge friction was the failure mode; now mitigated
- **Combines two competitive moats into one feature** — AI-first credibility + subscribe-to-upstream practicality
- **Test-first verification is principled** — AI confidence calibrated against ground truth

### Negative / accepted tradeoffs

- **LLM cost compounds across upgrades** — mitigated by prompt caching + per-version-pair analysis cache
- **Probabilistic confidence means occasional misses** — mitigated by engineer review default + circuit breaker + revert path
- **Test suite quality determines effectiveness** — adopters with thin test suites get less value
- **Merge plan complexity scales with number of subscribed packages** — large-monorepo upgraders pay cost; single-package adopters benefit immediately

### Cross-cutting

- [ADR-0012](./ADR-0012-ai-coworker-internal-ops.md) — AI Coworker primitives + architecture registry feed signature extraction
- [ADR-0013](./ADR-0013-plugin-spec-and-ai-compat.md) — same compat methodology, different surface (plugin vs shell customization)
- [ADR-0011](./ADR-0011-llm-gateway.md) — LLM calls through Gateway with cost tracking
- [ADR-0006](./ADR-0006-observability.md) — circuit breaker reads incident signals
- [ADR-0005](./ADR-0005-event-bus.md) — upgrade application emits events for cross-system awareness

## Implementation notes

- `packages/upgrade-agent` — core agent + signature extractor + merge plan generator + test harness
- `packages/upgrade-agent-autonomous` — v1 autonomous mode + canary + circuit breaker
- Per-version-pair analysis cache lives in `platform.upgrade_analysis_cache`
- Run history in `platform.upgrade_history`
- Engineer review UI lands as part of admin UI v1+ ([ADR-0017](./ADR-0017-status-brand-admin.md))

## Revisit triggers

- **Production incidents from autonomous mode** — tighten circuit breaker; require canary success before full apply
- **High false-positive rate** — engineers reject too many proposals → improve LLM prompts; consider model upgrade
- **Auto-fix demand** — adopters want LLM to propose patches for breaking changes → ship v1+ feature
- **External orchestrator integration** — adopters want Renovate/Dependabot integration → adapter v1+
