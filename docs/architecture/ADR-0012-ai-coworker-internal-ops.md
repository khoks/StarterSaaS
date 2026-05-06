# ADR-0012 — AI Subsystem 5: AI Coworker Platform for Internal Ops

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)

---

## Context

Per RAW_VISION:

> "There will be another AI system in the SAS Enterprise which will allow the control of all the SA components and capabilities and layers via AI Agent coworkers for the SAS Enterprise employees. This AI system will allow the deployment the triage the maintenance the discovery the change management the the observability the the development and everything to be possible via AI agent coworkers... will be aware of all the capabilities and layers and systems within the SAS enterprise and what their endpoints are what their API contracts are what their event schema is what their responsibilities are what's the logic written in them..."

This ADR locks the AI Coworker platform — agents for **internal employees** (not customers).

Constraints:

- [D-15](../decisions/DECISIONS_LOG.md) phase fit: v2 full; **MVP-1 lite subset** already locked via [D-17](../decisions/DECISIONS_LOG.md), [D-22](../decisions/DECISIONS_LOG.md), [D-23](../decisions/DECISIONS_LOG.md)
- [D-25](../decisions/DECISIONS_LOG.md) Zod boundaries — feeds the architecture registry
- [D-47](../decisions/DECISIONS_LOG.md) LLM Gateway — all calls through it
- [D-48](../decisions/DECISIONS_LOG.md) RBAC — `platform_admin` only

## Decision

### Phase fit

| Component | Phase |
|---|---|
| Architecture registry (auto-populated) | **MVP-1** |
| AI-assisted upstream merge (D-17) | **MVP-1** (per D-17) |
| AI-assisted config generation (D-22) | **MVP-1** (per D-22) |
| AI-validated plugin compatibility (D-23) | **MVP-1** (per D-23) |
| Conversational interface for platform admins | **v2** |
| Multi-step workflow execution | **v2** |
| Scheduled tasks ("run this daily") | **v2** |
| Knowledge synthesis from audit + observability | **v2** |
| Skills (deploy / triage / migrate / runbook) | **v2** |

### Architecture registry (`platform.architecture_registry`)

Auto-populated from kit's `package.json` dependency graph + adopter's custom packages. Tracks:

```text
component_id (e.g., "@starter-saas/llm-gateway")
component_kind (kit-package | adopter-package | external-service)
endpoints (list of HTTP endpoints with paths, methods, Zod request/response schemas)
event_schemas (list of topics + Zod payload schemas the component publishes / consumes)
responsibilities (markdown-formatted description of what the component does)
api_contracts (cross-component interfaces this component exposes / consumes)
current_version (semver)
adapter_for (if this component is an adapter, which contract it implements)
discovered_at, updated_at
```

Auto-discovery hooks:

- `package.json` scan for kit/adopter packages
- Drizzle schema introspection for table-level contracts
- Zod schema collection for endpoint + event contracts (per [D-25](../decisions/DECISIONS_LOG.md))
- AdR file scan for high-level responsibilities and decisions

Refreshed on:

- `npx @starter-saas/cli doctor --refresh-architecture` (manual)
- post-deploy hook (auto)
- detected schema migration (auto via D-44)

This registry is **the foundation** for all AI Coworker capabilities. Without it, agents have no map of the system.

### MVP-1 lite (already locked elsewhere)

- **D-17 — AI-assisted upstream merge**: examines user customizations via adapter usage signatures (extracted from architecture registry); proposes merge plans; tests against user's tests; surfaces low-confidence conflicts
- **D-22 — AI-assisted config generation**: NL → `starter.config.ts`; uses architecture registry for adapter recommendations
- **D-23 — AI-validated plugin compatibility**: simulates kit upgrades against plugin hook signatures; uses architecture registry for kit's extension-point spec

These three features ship MVP-1 and are the visible AI Coworker surface. Each gets its own implementation ADR ([ADR-0014](./ADR-0014-ai-assisted-merge.md), [ADR-0015](./ADR-0015-ai-assisted-config-gen.md), [ADR-0013](./ADR-0013-plugin-spec-and-ai-compat.md) — drafted in [Q6 of STORY-009](../../project/stories/STORY-009-architecture-grooming.md)).

### v2 full vision

```text
Platform admin: "Deploy capability X to staging, then run the new tenant E2E test"
    ↓
AI Coworker:
  1. Plans steps using architecture registry
  2. Calls kit CLI subcommands (deploy, tenant test) per D-42
  3. Streams progress via D-43 deploy command portal
  4. Reports results
  5. Logs to platform.audit_log
```

Skills (v2):

| Skill | Purpose |
|---|---|
| `deploy_capability` | Programmatic invocation of `cli deploy` with safety checks |
| `diagnose_incident` | Cross-reference observability events + audit log + architecture registry |
| `query_observability` | NL → query against [ADR-0006](./ADR-0006-observability.md) backends |
| `propose_migration` | Schema evolution proposals (kit upgrade or adopter feature add) |
| `review_pr` | Code review based on architecture registry + Zod boundary discipline |
| `generate_runbook` | Compose runbooks from past incident resolutions |

### Tool registry (v2)

Wraps:

- Kit CLI subcommands (deploy / tenant / doctor / teardown per [D-42](../decisions/DECISIONS_LOG.md))
- Observability queries (per [ADR-0006](./ADR-0006-observability.md))
- Pulumi state inspection (per [ADR-0003](./ADR-0003-cloud-target.md))
- Drizzle schema introspection
- Event bus DLQ inspection / replay (per [ADR-0005](./ADR-0005-event-bus.md))

### Permission model

- **`platform_admin` role required** (per [ADR-0007](./ADR-0007-auth-provider.md))
- Every action audited to `platform.audit_log`
- Sensitive actions (deploy / teardown) require explicit confirmation
- Multi-step workflows: each step audited individually
- Adopter can configure per-action approval gates (e.g., "deploys require 2 admins")

## Considered alternatives

- **Coworker as v1 (not v2)** — rejected: full subsystem is broad scope; MVP-1 lite via D-17/D-22/D-23 already delivers the AI-first credibility; full conversational + workflow + scheduled tasks need foundation maturity.
- **Single Coworker for both customers and internal** — rejected: internal-ops privileges are too sensitive; separate platform per [ADR-0010](./ADR-0010-agent-platform.md).
- **External MCP server / agent platform integration** — considered; rejected: adds external dependency; can be added v1+ as adapter without changing the kit's internal Coworker shape.
- **Architecture registry stored ad-hoc (no DB)** — rejected: agents need queryability; `platform.architecture_registry` table is correct.
- **No `platform_admin` separation** — rejected: per-tenant admin must NOT have access to deploy capabilities of the entire SaaS enterprise.

## Consequences

### Positive

- **MVP-1 lite subset already locked** — no scope creep
- **Architecture registry is foundational** — feeds D-17 / D-22 / D-23 mechanisms
- **v2 full vision is concrete** — clear deferral, not vague
- **Cross-references to D-17 / D-22 / D-23** keep this ADR aligned with locked-mechanism ADRs

### Negative / accepted tradeoffs

- **v2 full requires MVP-1 lite + v1 stability before shipping** — phased dependency; honest pacing
- **Architecture registry auto-discovery is a discipline** — adopter packages must declare schemas (Zod per [D-25](../decisions/DECISIONS_LOG.md)); kit reinforces this in code reviews and AI-validated plugin compat (D-23)
- **`platform_admin` only access** — adopter's per-tenant admins can NOT use Coworker; they must escalate to platform_admin

### Cross-cutting

- [ADR-0014](./ADR-0014-ai-assisted-merge.md) (Q6) — extends D-17 mechanism using Coworker primitives
- [ADR-0015](./ADR-0015-ai-assisted-config-gen.md) (Q6) — extends D-22 using Coworker primitives
- [ADR-0013](./ADR-0013-plugin-spec-and-ai-compat.md) (Q6) — extends D-23 using architecture registry
- [ADR-0018](./ADR-0018-deploy-portal-mechanism.md) (Q6) — deploy command portal uses Coworker for AI narration
- [ADR-0008](./ADR-0008-customer-profile-builder.md) (Sub 1) — Coworker can query profile-builder health via architecture registry

## Implementation notes

- `packages/ai-coworker` — Coworker core + architecture registry interface
- `packages/ai-coworker-skills` — v2 skills (`deploy_capability`, etc.)
- Architecture registry refresh runs as a saga (per [D-45](../decisions/DECISIONS_LOG.md)) — resumable across very-large package graphs
- Agents use [ADR-0009](./ADR-0009-context-resolving-query.md) (Sub 2 Context Query Service) to query the registry by NL — same plumbing as customer-facing agents
- All Coworker LLM calls go through Gateway ([D-47](../decisions/DECISIONS_LOG.md)) with kit-default model = Opus 4.7 (per [D-35](../decisions/DECISIONS_LOG.md)) for code-aware tasks

## Revisit triggers

- **MVP-1 lite features in production** → promote v2 from "planned" to "in-progress" with feedback
- **Adopter requests scheduled tasks earlier** → consider promoting from v2 to v1
- **External agent platform (MCP / Devin / etc.) integration demand** → add adapter v1+
- **Architecture registry accuracy issues** → tighten Zod discipline; better auto-discovery hooks
- **Coworker action causes incident** → review approval gate model; consider stricter defaults
