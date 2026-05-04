---
id: STORY-011
title: Cloud-target decision — AWS / GCP / both
type: story
status: in-progress
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

- [ ] Primary cloud target decided (AWS / GCP / both for MVP-1)
- [ ] IaC tool decided (Terraform / Pulumi / Crossplane / custom)
- [ ] Module structure sketched (`infra/aws/*`, `infra/gcp/*`, `infra/shared/*` or similar)
- [ ] Multi-cloud strategy documented if both clouds are MVP-1 (or deferred to v2 if only one is MVP-1)
- [ ] ADR-0003 written, status: accepted

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
