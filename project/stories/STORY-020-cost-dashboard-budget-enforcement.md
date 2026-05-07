---
id: STORY-020
title: AI cost dashboards + per-tenant LLM budget enforcement
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-005
phase: mvp
tags: [mvp, llm-cost, budgets, dashboards]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Implement the AI cost-discipline layer per [D-38](../../docs/decisions/DECISIONS_LOG.md) and [ADR-0006](../../docs/architecture/ADR-0006-observability.md). Cost rollup consumer subscribes to `platform.llm_call` topic on event bus and aggregates into `platform.observability_events` (per-tenant, per-feature, per-provider, per-time-period). Themed React admin dashboard at `/admin/observability` (post-auth, RBAC-gated to `platform_admin`). `platform.tenant_budgets` table with hard / soft limits + 80% soft-threshold default + adopter-configurable defaults. Anthropic prompt caching transparently leveraged where the active provider supports it.

## Acceptance criteria

- [ ] Cost rollup consumer subscribes to `platform.llm_call`; aggregates into `platform.observability_events`
- [ ] `platform.tenant_budgets` table created with `(tenant_id, period, limit_usd, soft_threshold_pct, hard_enforce, exempt_features)`
- [ ] Budget enforcer middleware in `@starter-saas/llm-gateway` checks budget before every LLM call
- [ ] Soft threshold breach (80% default) → emits warning event; surfaces in dashboard; sends notification per adopter config
- [ ] Hard limit breach → LLM call returns `BUDGET_EXCEEDED` error
- [ ] React admin dashboard at `/admin/observability` shows: per-provider, per-tenant, per-feature, budget % consumed, cache hit rate, token-distribution histogram
- [ ] Dashboard themed via `@starter-saas/brand` tokens (per STORY-029)
- [ ] Anthropic prompt caching transparently applied; cache-hit metadata captured in spans
- [ ] Integration test: LLM call → cost event on bus → rollup updates → dashboard reflects → budget threshold breach blocks subsequent calls

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: STORY-022 (LLM Gateway needs cost+budget hooks but they can land in parallel)
- Blocked by: STORY-019 (observability foundation); STORY-017 (event bus); STORY-013 (RBAC for dashboard access)

## Related

- ADRs: [ADR-0006](../../docs/architecture/ADR-0006-observability.md), [ADR-0011](../../docs/architecture/ADR-0011-llm-gateway.md)
- Decisions: D-38, D-46

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
