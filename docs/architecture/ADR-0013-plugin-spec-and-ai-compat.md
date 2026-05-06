# ADR-0013 — Plugin extension-point machine-readable spec + AI-validated compat methodology

- **Status:** accepted
- **Date:** 2026-05-05
- **Deciders:** Rahul Singh Khokhar (project owner)

---

## Context

[D-23](../decisions/DECISIONS_LOG.md) locked **AI-validated plugin compatibility** as an MVP-1 feature: when a user authors a plugin, AI Subsystem 5 ([ADR-0012](./ADR-0012-ai-coworker-internal-ops.md)) simulates upcoming kit upgrades against the plugin's hook signatures and surfaces likely breakage *before* the user merges an upstream update.

That feature has prerequisites: plugin extension points must be **machine-readable** so AI agents can reason about them, and there must be a **methodology** for the compat check itself.

This ADR fleshes out both. It builds on [D-20](../decisions/DECISIONS_LOG.md) (layered white-label: config + adapter + plugin), [D-25](../decisions/DECISIONS_LOG.md) (Zod boundaries), [D-23](../decisions/DECISIONS_LOG.md), and [ADR-0012](./ADR-0012-ai-coworker-internal-ops.md) (architecture registry).

## Decision

### Extension-point spec format

Each kit package that exposes plugin extension points declares them in `packages/<pkg>/extension-points/`:

```typescript
// packages/auth/extension-points/v1/sign-in-hook.ts
import { z } from "zod";

export const SignInHookContextSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    tenantId: z.string().uuid(),
  }),
  request: z.object({
    ip: z.string(),
    userAgent: z.string(),
  }),
});

export const SignInHookResultSchema = z.object({
  allow: z.boolean(),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const SIGN_IN_HOOK = {
  id: "auth.sign-in-hook",
  version: "1.0.0",                                    // semver per ext-point
  contextSchema: SignInHookContextSchema,
  resultSchema: SignInHookResultSchema,
  description: "Called after credential validation, before session creation. Plugins can deny sign-in, add MFA challenges, log events, or attach metadata to the user's session.",
  introducedAt: "0.1.0",                               // kit version when ext-point was added
  deprecatedAt: null,                                  // kit version when deprecated (if applicable)
} as const;
```

**Properties:**

- **Zod schemas** define context (input) + result (output) types per [D-25](../decisions/DECISIONS_LOG.md)
- **Semver per ext-point** — the ext-point itself is versioned independently of its hosting package; breaking changes bump major version
- **Description** is human-readable AND AI-readable — used by AI agents for reasoning
- **`introducedAt` + `deprecatedAt`** track lifecycle for compat checks
- **Auto-discovered** by the architecture registry ([ADR-0012](./ADR-0012-ai-coworker-internal-ops.md)) at boot

### Plugin manifest format

```typescript
// adopter-shell/plugins/my-mfa-enforcer/manifest.ts
export const MANIFEST = {
  id: "@my-org/mfa-enforcer",
  version: "0.3.2",
  kit_version_range: ">=0.1.0 <2.0.0",                 // semver constraint
  hooks: [
    { extension_point: "auth.sign-in-hook", version: "1.x" },
    { extension_point: "auth.session-validate-hook", version: "1.x" },
  ],
  description: "Enforces MFA for tenants with PCI compliance flag.",
  permissions: ["read:tenant_config", "write:audit_log"],
};
```

Manifest is itself a Zod-validated structure. Loaded at kit startup; plugins with invalid manifests don't load.

### Compat-check mechanism

`npx @starter-saas/cli plugins check [--target-kit-version=X.Y.Z]` runs:

1. **Resolve target kit version** — defaults to latest published; explicit override possible
2. **Load adopter's plugin set** — read manifests; collect hooked ext-points
3. **Diff ext-points** — for each hooked ext-point, compare current local kit's spec vs target's spec (schema diff via Zod schema introspection)
4. **AI analysis** — for ext-points with non-trivial diffs, send the diff + plugin source code + ext-point description to the kit-default AI-assistance LLM (Opus 4.7 per [D-35](../decisions/DECISIONS_LOG.md)); LLM analyzes whether the plugin's hook implementation will still work
5. **Sandbox sim** — for high-risk diffs (LLM low-confidence or breaking schema change detected): spin up ephemeral sandbox (per below) and trial-run the plugin against the new ext-point spec
6. **Report** — structured output: per-plugin per-ext-point status (`compatible | needs-update | breaking`); confidence score per finding; recommended fixes

### Confidence scoring

| Score | Meaning | Engineer action |
|---|---|---|
| **High** (≥ 0.85) | Plugin hooks unchanged; no schema diff; or plugin code clearly handles the new shape | None — auto-pass |
| **Medium** (0.5–0.85) | Schema additions / non-breaking changes; plugin should work but not provably | Engineer review recommended |
| **Low** (< 0.5) | Schema removals / type changes; plugin likely breaks; sandbox sim run | Engineer review required; LLM provides recommended fixes |

Engineer can override any score with documented reason — entry logged to `platform.audit_log`.

### Sandbox sim environment

Used for medium / low confidence cases:

- **Isolated DB schema** — ephemeral schema (named `sandbox_<run_id>`) with kit's tables created from the target version; no tenant data
- **Isolated event bus** — Postgres NOTIFY pattern per [ADR-0005](./ADR-0005-event-bus.md), but on a separate `platform.outbox_sandbox` table partitioned by run
- **Plugin loaded against target kit version** — plugin source compiled with target kit's types
- **Test invocation** — plugin's own test suite (if present) run against the target ext-point shape; failures collected
- **Cleanup** — sandbox schemas dropped after run; all artifacts auto-archived to `platform.compat_check_runs`

Cost: each compat-check run costs roughly the LLM analysis cost + a one-time DB schema creation. Mitigated by running on-demand (not every commit).

### Side picks (locked)

| Setting | Default | Adopter-tunable? |
|---|---|---|
| Compat-check trigger | Manual via CLI; pre-merge hook in v1+ | Yes |
| AI confidence threshold for sandbox sim | < 0.5 (low) | Yes |
| Sandbox schema retention | 7 days | Yes |
| Compat-check audit log retention | 90 days | Yes |
| LLM model for compat analysis | Opus 4.7 (per [D-35](../decisions/DECISIONS_LOG.md)) | Yes (per-feature LLM choice per [D-47](../decisions/DECISIONS_LOG.md)) |

## Considered alternatives

- **Schema-only compat check (no AI)** — rejected: catches Zod-detectable breaking changes but misses semantic changes (e.g., "this field's meaning changed"). LLM analysis adds the semantic layer.
- **Full plugin behavioral testing (always run sandbox)** — rejected: too expensive; sandbox-sim only when confidence is low.
- **No semver per ext-point (track package version only)** — rejected: package version churns for unrelated reasons; ext-point semver lets us track stability per surface independently.
- **Auto-fix mode (LLM proposes patches)** — considered for v1+; deferred from MVP-1 (trust-but-verify is the right starting position).

## Consequences

### Positive

- Plugins can be AI-checked for upgrade safety **before** an adopter merges upstream — plugin maintenance tax reduced
- Machine-readable ext-points feed [ADR-0012](./ADR-0012-ai-coworker-internal-ops.md) architecture registry — compounds value
- Tight semver discipline per ext-point creates sustainable contract evolution

### Negative / accepted tradeoffs

- **Discipline cost on kit maintainers** — every ext-point change triggers an ext-point semver bump
- **Sandbox sim has resource overhead** — bounded by manual / pre-merge invocation
- **AI confidence is probabilistic** — false positives + false negatives expected; engineer override path is the safety valve

### Cross-cutting

- [ADR-0012](./ADR-0012-ai-coworker-internal-ops.md) — architecture registry stores ext-point specs
- [ADR-0014](./ADR-0014-ai-assisted-merge.md) — same compat-check methodology informs upstream-merge analysis
- [ADR-0011](./ADR-0011-llm-gateway.md) — LLM calls go through Gateway with cost tracking

## Implementation notes

- `packages/plugin-spec` — ext-point spec types + manifest validator
- `packages/plugin-compat-check` — CLI subcommand + diff engine + AI analysis + sandbox sim
- Ext-point auto-discovery is part of the architecture registry refresh ([ADR-0012](./ADR-0012-ai-coworker-internal-ops.md))
- Sandbox schema cleanup runs as a saga ([ADR-0005](./ADR-0005-event-bus.md)) — resumable across run failures

## Revisit triggers

- **False-positive rate too high** — adopters override too often → tighten LLM analysis prompt; consider model upgrade
- **False-negative rate causes production incidents** — increase sandbox sim threshold (more aggressive testing)
- **Adopter request for auto-fix** — promote v1+ feature; design fix-application flow
- **Ext-point semver drift** — kit-maintainer discipline lapses → tooling to catch unbumped semvers in CI
