# ADR-0018 — Deploy command portal mechanism

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)

---

## Context

[D-43](../decisions/DECISIONS_LOG.md) locked the **deploy command portal** as an MVP-1 feature: when `@starter-saas/cli deploy` runs, it spins up a local web server (default port 7732 with conflict detection) that opens a browser-based dashboard (TUI fallback for headless / `--no-open`). Portal shows real-time per-step status across the 10-step deploy flow ([D-42](../decisions/DECISIONS_LOG.md)), pause / resume / abort controls, streamed step logs, and AI-generated narration via the LLM Gateway ([D-47](../decisions/DECISIONS_LOG.md)).

This ADR locks the mechanism. Filed in [NOVEL_IDEAS.md](../vision/NOVEL_IDEAS.md) as medium-novelty.

## Decision

### Form factor

| Surface | Phase | Default |
|---|---|---|
| **Web (browser dashboard)** | MVP-1 | Primary, auto-opens at default port |
| **TUI (terminal UI)** | MVP-1 | Fallback for `--no-open` / headless |
| **Mobile** | v1+ | Optional companion view via QR code |

### Port allocation strategy

```text
DEFAULT: 7732
TRY: bind to 7732
  ↓
SUCCESS → use 7732, print URL: http://localhost:7732
FAILURE (already in use) → scan ports 7733-7799 for next free
  ↓
PRINT URL with chosen port + reason for non-default
```

Adopter override: `@starter-saas/cli deploy --portal-port=N` or `--no-portal` to disable entirely.

Conflict detection prevents binding to ports already in use; printed URL is always the actual binding (not the default).

### Pause / resume state machine

Pulumi operations are atomic per resource. Pause checks happen at resource boundaries — cannot pause mid-RDS-creation, can pause between resources.

```text
States: running | pause_requested | paused | abort_requested | aborted | done | error

Transitions:
  running --(user clicks Pause)--> pause_requested
  pause_requested --(current resource completes)--> paused
  paused --(user clicks Resume)--> running
  running | paused --(user clicks Abort)--> abort_requested
  abort_requested --(graceful Pulumi cancel)--> aborted
  running --(all 10 steps complete)--> done
  running --(unrecoverable error)--> error
```

Resume from paused: pick up at the next pending resource. Pulumi state preserves position. Engineer sees "Paused at: provisioning RDS Aurora cluster (step 6 of 10)" and can resume safely.

### Abort semantics

`abort_requested` triggers Pulumi's cancel API:

- Graceful: cloud provider operations are completed for in-flight resources
- State preserved: Pulumi stack state is consistent (no orphaned cloud resources)
- Engineer sees: "Aborting... waiting for in-flight resource to complete... aborted at step 6 of 10. Run `cli deploy` to resume from this state, or `cli teardown` to roll back."

Never a hard kill mid-resource (would leave orphans).

### AI narration

Per-step LLM-generated explanations (e.g., "Provisioning RDS Aurora cluster — typically 8-12 minutes; this configures multi-AZ replication and applies the schema-per-tenant initial migration").

```text
Step start →
  LLM Gateway (D-47) call with context: {step_id, resource_kind, expected_duration, kit_version}
    ↓
  Cached prompt template (D-38 prompt caching) + small dynamic context
    ↓
  Streaming response → portal narration panel
Step complete →
  Brief summary + handoff to next step
```

Prompt design:

- **Template-heavy** — most narration content is fixed per step type, with small dynamic insertions
- **Aggressive prompt caching** — kit-context is stable across deploys; only step + adopter context varies
- **Cost-bounded** — per-deploy narration cost roughly = number-of-steps × small-LLM-call (~$0.10-0.50 typical)

### Telemetry (opt-in default-OFF per D-42)

When adopter opts in via `--telemetry`:

- Step durations (per step type)
- Failure points + error categories (no PII)
- Time spent in pause state
- Narration token usage
- No secret values, no config content, no adopter identifying info

Helps kit improvement. Adopter can opt out anytime; data is anonymous.

### Headless / CI mode

`--no-open --tui-only --no-narration`:

- No browser
- TUI rendering to terminal
- No LLM narration calls (saves cost, removes external dep for CI)
- Same pause / resume / abort capabilities — but signal-driven (Ctrl-Z for pause, Ctrl-C for abort)

### `--no-portal` mode

For minimal CI environments or when deploys must not bind any port:

- Plain terminal output
- No TUI, no web
- Pure CLI logging
- Pause / resume not available; abort via Ctrl-C with same graceful Pulumi cancel

### Side picks (locked)

| Setting | Default | Adopter-tunable? |
|---|---|---|
| Default portal port | 7732 | Yes via `--portal-port=N` |
| Port scan range on conflict | 7733-7799 | Yes |
| Auto-open browser | Yes | `--no-open` to skip |
| AI narration | On in MVP-1 | `--no-narration` |
| Telemetry | OFF | `--telemetry` to enable |
| Pause check interval | At every resource boundary | Not adopter-tunable (Pulumi-driven) |

## Considered alternatives

- **Hosted dashboard (cloud-side)** — rejected: chicken-and-egg for first deploy; adds cloud dependency for the UI itself
- **Pure terminal output (no portal)** — rejected: defeats the purpose; portal IS the UX win
- **Mid-resource pause** — rejected: can leave orphaned cloud resources; resource-boundary pause is the safe model
- **WebSocket protocol** — considered; rejected: SSE is simpler for unidirectional progress streaming; same as [ADR-0016](./ADR-0016-ai-streaming-ui-integration.md)
- **Mandatory telemetry** — rejected: violates D-42 privacy default
- **No `--no-portal` option** — rejected: CI environments without port binding need a path

## Consequences

### Positive

- **D-13 demo flow upgraded materially** — first engineer shows founder a clean dashboard, not a terminal scroll
- **Pause / resume eliminates "is it stuck?" anxiety** — adopters have real-time visibility + control
- **Resource-boundary pause is correct** — no orphaned cloud resources
- **CI-friendly headless mode** — `--no-portal` covers minimal environments
- **AI narration is bounded cost** — template-heavy + prompt-cached

### Negative / accepted tradeoffs

- **Adds MVP-1 scope** — local web server + UI + AI narration. Accepted because of D-13 UX win
- **Browser auto-open feels invasive to some** — `--no-open` flag; can be set as default in `starter.config.ts`
- **Port 7732 could collide** — port scan + URL print + override flag handles it
- **AI narration cost compounds across deploys** — bounded by prompt caching + opt-out flag

### Cross-cutting

- [D-42](../decisions/DECISIONS_LOG.md) — 10-step deploy flow is what the portal shows
- [D-43](../decisions/DECISIONS_LOG.md) — locked the existence of this portal
- [ADR-0011](./ADR-0011-llm-gateway.md) — narration LLM calls go through Gateway
- [ADR-0016](./ADR-0016-ai-streaming-ui-integration.md) — same SSE streaming protocol
- [ADR-0006](./ADR-0006-observability.md) — telemetry surfaces in cost dashboards (opt-in only)

## Implementation notes

- `packages/cli/src/portal/` — local web server (Fastify per [D-24](../decisions/DECISIONS_LOG.md)) + React dashboard
- `packages/cli/src/portal/tui/` — TUI fallback (Ink or similar)
- Pause / resume state machine encoded as a TS state machine
- Pulumi automation API used for resource-boundary control
- AI narration prompts in `packages/cli/src/portal/narration/prompts/` per step type
- Telemetry gathered via OTel + adopter-config gate; anonymized at source

## Revisit triggers

- **Port conflicts frequent** — adopters report 7732 collisions → bump default port; revisit scan range
- **Adopters dislike browser auto-open** — change default to TUI-first
- **Narration costs high** — tighten prompt caching; consider model downgrade for narration only
- **Pause / resume edge cases** — Pulumi state corruption observed → tighten boundary checks
- **CI integration friction** — `--no-portal` insufficient → expose more granular flags
