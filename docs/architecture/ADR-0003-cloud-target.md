# ADR-0003 — Cloud target + IaC tool + deploy-script architecture for MVP-1

- **Status:** accepted
- **Date:** 2026-05-02
- **Deciders:** Rahul Singh Khokhar (project owner)
- **Supersedes:** (none)
- **Superseded by:** (none)

---

## Context

This ADR closes [STORY-011](../../project/stories/STORY-011-cloud-target-decision.md) and locks the cloud target, IaC tool, cloud-resource module structure, deploy-CLI architecture, and the deploy command portal. It synthesizes 5 decision rows (D-39 through D-43) and references the load-bearing prior decisions D-15 (one-command deploy headline), D-16 (subscribe-to-upstream + adapter pattern), D-22 (AI-assisted config generation), D-24 (TypeScript stack), D-32 / D-33 / D-37 (Postgres + schema-per-tenant + pgvector — all need cloud-equivalent provisioning), and D-38 (AI cost / observability).

Constraints to satisfy:

1. **D-15** — *"one-command deployable to AWS or GCP"* in the headline pitch. Both clouds must work at MVP-1, not aspirationally.
2. **D-13** persona — founder's first engineer demos to founder in days, not sprints. Deploy ergonomics matter at minute 1.
3. **D-24** — TypeScript-only stack at MVP-1. No language proliferation just for IaC.
4. **D-16** — every concrete cloud pick must be an adapter slot adopters can swap.
5. **D-22 / D-23 / D-17** — AI-introspectable artifacts (not custom DSLs).

## Decision

### Cloud target (D-39)

- **Both AWS and GCP supported from MVP-1.**
- **One-cloud-per-deploy** at MVP-1; multi-region per cloud, multi-cloud per adopter all deferred to v1+.
- Each cloud ships as its own kit package (`@starter-saas/infra-aws`, `@starter-saas/infra-gcp`) with independently-versioned IaC modules.
- `starter.config.ts` declares `cloud: "aws" | "gcp"`; the deploy script picks modules accordingly.

### IaC tool (D-40)

- **Pulumi (TypeScript)** as the sole IaC tool at MVP-1.
- AWS + GCP providers are mature; both are in active maintenance.
- Pulumi programs ship as part of the kit's monorepo (`packages/infra-{shared,aws,gcp}/`).
- Adopter's `starter.config.ts` is consumed by Pulumi via the Pulumi Automation API at deploy time — not a separate `pulumi up` invocation; the deploy CLI drives Pulumi programmatically.

### Cloud-resource architecture (D-41)

#### Module structure

```text
packages/
├── infra-shared/                # cloud-agnostic contracts + types
│   ├── types.ts
│   └── adapters.ts              # adapter interfaces every cloud impl satisfies
├── infra-aws/                   # @starter-saas/infra-aws
│   ├── postgres.ts              # RDS Aurora Postgres (D-32)
│   ├── pgvector.ts              # extension on the RDS instance (D-37)
│   ├── ollama.ts                # ECS Fargate self-hosted Ollama (opt-in)
│   ├── llm-gateway.ts           # ECS / Fargate or Lambda
│   ├── observability.ts         # CloudWatch + OTel collector (extends D-38)
│   ├── secrets.ts               # AWS Secrets Manager
│   └── network.ts               # VPC, subnets, security groups
└── infra-gcp/                   # @starter-saas/infra-gcp
    ├── postgres.ts              # Cloud SQL Postgres
    ├── pgvector.ts              # extension on Cloud SQL
    ├── ollama.ts                # GKE / Cloud Run self-hosted (opt-in)
    ├── llm-gateway.ts           # Cloud Run or GKE
    ├── observability.ts         # Cloud Logging + OTel collector
    ├── secrets.ts               # GCP Secret Manager
    └── network.ts               # VPC, subnets, firewall rules
```

#### Default regions (prompted, not silent)

- **AWS:** `us-west-2` (Oregon)
- **GCP:** `us-west1` (Oregon)

Geographically aligned so adopters who later go multi-cloud (v1+) get consistent latency profiles. The deploy CLI **prompts the adopter to confirm or override** before provisioning — no silent geographic default.

#### Service tier defaults

| Resource | MVP-1 default | v1+ alternative |
|---|---|---|
| Postgres | Managed (RDS Aurora / Cloud SQL) | Self-hosted-in-VPC adapter |
| Ollama | Self-hosted in VPC pod (opt-in) | (no managed service exists) |
| Vector DB | pgvector extension on managed Postgres | Adapter for Qdrant / Pinecone / Weaviate |
| Secrets | Cloud-native (Secrets Manager / Secret Manager) | (none planned) |

### Deploy CLI (D-42)

- **`@starter-saas/cli`** TS CLI tool with subcommands:
  - `init` — scaffolds the thin shell (calls `create-starter-saas`)
  - `deploy` — first or update deploy
  - `tenant` — per-tenant provisioning subcommands (`provision`, `migrate`, `delete`)
  - `teardown` — destroy everything (triple-confirm prompt + explicit data-loss warning)
  - `doctor` — diagnose state, surface drift (MVP-1)

#### 10-step idempotent deploy flow

1. **Validate `starter.config.ts`** — Zod schema check (D-25 boundary)
2. **Cloud auth check** — `aws sts get-caller-identity` / `gcloud auth list`; fail fast with provider-specific guidance
3. **State backend bootstrap** — create S3 / GCS bucket for Pulumi state if missing
4. **AI-assisted config offer** (D-22) — opt-in via `--ai-assist`
5. **Network** — VPC + subnets + security groups
6. **Data layer** — Postgres + pgvector extension + secrets
7. **Schema-per-tenant init** (D-33) — drizzle-kit per-schema migration runner
8. **App services** — Fastify gateway + LLM Gateway + AI subsystems + optional Ollama
9. **Smoke tests** — health endpoints + AI Gateway latency probe + sample query against pgvector
10. **Success summary** — print URLs + next-steps + first-time runbook

Pulumi handles step idempotency natively. drizzle-kit tracks migrations. Smoke tests are read-only. **The script is fully re-runnable.**

#### Secrets bootstrap modes

| Mode | When |
|---|---|
| **Interactive prompts** (default) | First deploy; engineer is at the terminal |
| **`--env-file <path>`** | CI / non-interactive |
| **`--from-secrets-manager`** | Pull from a pre-existing AWS Secrets Manager / GCP Secret Manager / 1Password vault |

Required at minimum: cloud creds (AWS_PROFILE / GOOGLE_APPLICATION_CREDENTIALS), one LLM provider key (or Ollama-only), DB master password.

#### Defaults

- **Default deploy timeout:** 30 minutes (safety net only — D-43 portal is the primary visibility)
- **Telemetry:** opt-in via `--telemetry`, default OFF (privacy-first)
- **Triple-confirm teardown** with explicit data-loss warning
- **`--dry-run` flag:** deferred to v1+

### Deploy command portal (D-43, MVP-1)

When `@starter-saas/cli deploy` runs, it spins up a **local web server** (default port `7732` with conflict detection; TUI fallback for headless / `--no-open`) that opens a browser-based dashboard.

**Portal capabilities:**

- Real-time per-step status across the 10-step deploy flow
- **Pause / resume / abort** controls — abort routes through proper Pulumi cleanup (not a Ctrl-C kill)
- Streamed step logs
- **AI-generated narration** per step — explains arcane steps in plain English ("provisioning RDS Aurora cluster — typically 8-12 minutes; this configures …") via the LLM Gateway (D-15 Sub 4) with aggressive prompt caching (D-38)

**Why local-not-hosted:** no cloud dependency for the UI itself; works offline once running; first-deploy works before any cloud infra exists. Filed as medium-novelty in [`NOVEL_IDEAS.md`](../vision/NOVEL_IDEAS.md).

## Considered alternatives

### Cloud target

- **AWS-only MVP-1** — rejected: contradicts D-15's "or GCP" promise; loses ~50% of D-13 adopters who arrive on GCP.
- **GCP-only MVP-1** — rejected: mirror image; same problem.
- **Cloud-agnostic abstraction** (Crossplane / Pulumi multi-cloud single-stack) — rejected: leaky abstractions; cloud-specific feature access (AWS Bedrock, GCP Vertex) becomes second-class.

### IaC tool

- **Terraform (HCL)** — rejected: separate language from D-24's TS stack; HCL is harder for AI agents (D-22 / D-23 / D-17) to introspect than plain TS.
- **Terraform via CDK-TF** — strong runner-up; inherits Terraform's massive provider ecosystem with TS author experience. Rejected because Pulumi is purpose-built for TS-native IaC vs. retrofitted Terraform layer; Pulumi's Automation API is mature and integrates cleanly with our deploy CLI. CDK-TF reserved as a fallback if Pulumi maturity becomes a concern (revisit at v1+ via the adapter pattern).
- **Crossplane** — rejected: K8s-native; introduces K8s cluster as a deploy prerequisite (heavier than necessary for MVP-1).
- **Custom shell scripts** — rejected: doesn't scale beyond a single cloud + a single resource type.

### Deploy CLI form factor

- **Bash script** — rejected: Mac/Linux-only without WSL; awkward to extend with AI features; doesn't match D-24.
- **Shell wrapper around Pulumi** — rejected: coupled to Pulumi DX; bypasses our own subcommand structure.

### Deploy command portal

- **Pure CLI with terminal-only progress** — rejected by user: terminal-only progress is the worst-of-all-worlds for D-13 persona's first-impression demo; "trust the timeout" is not a UX.
- **Hosted dashboard (cloud-side)** — rejected: requires cloud infra to exist before the dashboard works (chicken-and-egg for first deploy); adds operational dependency.

## Consequences

### Positive

- **Honors D-15 headline pitch** — "one-command deployable to AWS or GCP" is now load-bearing, not aspirational.
- **TS unified stack** — Pulumi TS keeps engineers in one language across kit dev, adopter shells, and IaC.
- **AI-introspectable IaC** — Pulumi programs as TS code can be analyzed by AI agents (D-22, D-23, D-17). Future ADR can extend AI-assisted IaC drift detection.
- **Local command portal differentiates the deploy UX** — adopter has real-time visibility + control, eliminating "is it stuck?" anxiety.
- **Adapter-everywhere pattern** preserved per D-16: cloud, IaC tool, deploy script behaviors are all swappable.

### Negative / accepted tradeoffs

- **~150% scope on infra** vs. single-cloud MVP-1. Mitigated by shared adapter contracts (`packages/infra-shared/`).
- **Pulumi has smaller community than Terraform.** Mitigated by mature AWS + GCP providers and CDK-TF as a documented v1+ fallback.
- **Deploy command portal adds MVP-1 scope** — local web server + UI + AI narration. Accepted because the UX delta for D-13 persona is significant and the AI narration costs are bounded by D-38 prompt caching.
- **Default 30-min deploy timeout** is still needed as a safety net even with the portal — for true hangs / network failures where the portal itself can't reach back.
- **One-cloud-per-deploy** means adopters who want multi-cloud HA wait until v1+. Acceptable for MVP-1.

### Cross-cutting

The following ADRs in STORY-009 will reference and extend this lockdown:

- **ADR-0004** — Multi-tenancy detail: per-schema migration runner (extends D-33 + step 7 of the deploy flow).
- **ADR-0006** — Observability: per-cloud LLM observability adapters (extends D-38 + step 9).
- **ADR-0011** — LLM Gateway: integration with the deploy portal for AI narration (extends D-15 Sub 4 + D-43).
- **ADR-0014** — AI-assisted upstream merge: extending to AI-assisted IaC drift detection (extends D-17).
- **ADR-0015** — AI-assisted config generation: integration with `--ai-assist` flag (extends D-22 + step 4).

## Implementation notes

- `@starter-saas/cli` is its own package; published independently per D-31 / D-21.
- Pulumi Automation API drives provisioning programmatically (no `pulumi up` shelled out to the user's terminal).
- Command portal uses LLM Gateway (D-15 Sub 4) for narration; aggressively uses prompt caching (D-38) — narrations are templates with caller-state-only variability.
- Telemetry uses OTel + adopter-config gate; never enabled without explicit `--telemetry` flag.
- Each `packages/infra-*` declares its own `package.json` with semver-driven independent versioning per D-31.

## Revisit triggers

- **Pulumi maturity issues** — community shrinks / provider deprecations / breaking changes hurt adoption → swap to CDK-TF v1+.
- **Multi-region per adopter MVP-1 demand** — bump v1+ scope to MVP-1 if adopter feedback warrants.
- **Cloud expansion** — Azure / Cloudflare / DigitalOcean adapter requests at v1+ scale → new ADR per cloud.
- **Command portal UX issues** — port conflicts, browser auto-open intrusive, AI narration cost > expected → revise.
- **Default region preferences shift** — adopter feedback indicates `us-east-1` / `us-central1` are more common → update prompt defaults.
- **Bash deploy demand** — non-TS adopters request a shell-only path → consider a thin shim that wraps the TS CLI for headless POSIX use.
