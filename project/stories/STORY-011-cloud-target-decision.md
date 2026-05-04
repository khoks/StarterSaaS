---
id: STORY-011
title: Cloud-target decision — AWS / GCP / both
type: story
status: done
priority: P0
estimate: M
parent: EPIC-002
phase: scaffolding
tags: [grooming, cloud, phase-b]
created: 2026-04-25
updated: 2026-05-02
---

## Description

As the project owner, I need the cloud target for MVP-1 locked: AWS-only, GCP-only, both (via Terraform abstraction or Pulumi), or a custom shell wrapper. Output: ADR-0003 with the locked target + IaC tool + module structure.

## Acceptance criteria

- [x] Primary cloud target decided (AWS / GCP / both for MVP-1) — *locked 2026-05-02 as D-39: both AWS + GCP from MVP-1, one-cloud-per-deploy*
- [x] IaC tool decided (Terraform / Pulumi / Crossplane / custom) — *locked 2026-05-02 as D-40: Pulumi (TypeScript)*
- [x] Module structure sketched (`infra/aws/*`, `infra/gcp/*`, `infra/shared/*` or similar) — *locked 2026-05-02 as D-41: `packages/infra-shared/` + `packages/infra-aws/` + `packages/infra-gcp/`; default regions us-west-2 / us-west1 prompted*
- [x] Multi-cloud strategy documented if both clouds are MVP-1 (or deferred to v2 if only one is MVP-1) — *locked 2026-05-02 as D-39: one-cloud-per-deploy at MVP-1; multi-region / multi-cloud-per-adopter v1+*
- [x] ADR-0003 written, status: accepted — *2026-05-02; lives at [`docs/architecture/ADR-0003-cloud-target.md`](../../docs/architecture/ADR-0003-cloud-target.md); references D-15, D-16, D-22, D-32, D-33, D-37, D-38, D-39..D-43*

## Tasks under this Story

(Tasks created on demand during grooming.)

## Dependencies

- Blocks: STORY-012, all infra-related Stories in Phase D
- Blocked by: STORY-010 (some stack choices have stronger ecosystem support on one cloud)

## Notes

Plan recommendation: AWS-only for MVP-1, Terraform-based, GCP added in v2. Tradeoff: "multi-cloud on day 1" is a 2× scope tax for half the credibility. User has not yet approved.

## Activity log

- 2026-04-25 — created (Phase B placeholder)
- 2026-05-02 — picked up; STORY-010 closed (D-24..D-38 locked, ADR-0002 accepted). ADR-0003 (cloud target) will reference D-15 (one-command deploy is in the headline pitch — implies both AWS and GCP from MVP-1) + D-16 (subscribe-to-upstream applies to deploy script + IaC modules) + D-32 (Postgres) + D-33 (schema-per-tenant) + D-37 (pgvector). First question: cloud-target — AWS-only / GCP-only / both from MVP-1 / cloud-agnostic abstraction.
- 2026-05-02 — **Q1 locked**: cloud target = **both AWS + GCP from MVP-1** (D-39). IaC = **Pulumi TypeScript** (D-40). Module structure = `packages/infra-shared/` + `packages/infra-aws/` + `packages/infra-gcp/` (D-41). Default regions us-west-2 / us-west1 (geographically aligned) prompted-not-silent. Managed Postgres MVP-1; self-hosted Ollama in VPC pod (opt-in); one-cloud-per-deploy at MVP-1 (multi-region / multi-cloud per adopter v1+). 4 of 5 ACs ticked — only ADR-0003 write-up remains. Next: Q2 — deploy-script architecture (one-command flow + secrets bootstrap + idempotency + rollback + AI-assisted setup).
- 2026-05-02 — **Q2 locked**: deploy CLI = **`@starter-saas/cli`** TS tool with `init` / `deploy` / `tenant` / `teardown` / `doctor` subcommands; 10-step idempotent flow; Pulumi-native idempotency; interactive secrets default + `--env-file` + `--from-secrets-manager`; AI-assisted opt-in via `--ai-assist`; anonymous telemetry opt-in default-OFF; triple-confirm teardown; default 30-min deploy timeout (safety net only — D-43 portal is the visibility primary); `doctor` MVP-1; `--dry-run` v1+. Logged as D-42. **D-43 (NEW)**: Deploy command portal — local web server (default port 7732) opens a browser dashboard during `deploy` showing real-time step status + pause / resume / abort controls + streamed logs + AI-generated narration via LLM Gateway. User-proposed; medium novelty; filed in NOVEL_IDEAS.
- 2026-05-02 — **ADR-0003 written** at `docs/architecture/ADR-0003-cloud-target.md` (status: accepted) — synthesizing D-15, D-16, D-22, D-32, D-33, D-37, D-38, D-39..D-43.
- 2026-05-02 — **STORY-011 done.** All 5 ACs ticked. 5 decisions locked (D-39 through D-43). 1 ADR written (ADR-0003). 1 NOVEL_IDEAS entry (Local command portal). EPIC-002 progresses to STORY-009 (architecture grooming) — final story before STORY-012 (MVP-1 scope lockdown).
