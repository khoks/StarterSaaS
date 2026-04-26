---
id: STORY-011
title: Cloud-target decision — AWS / GCP / both
type: story
status: backlog
priority: P0
estimate: M
parent: EPIC-002
phase: scaffolding
tags: [grooming, cloud, phase-b]
created: 2026-04-25
updated: 2026-04-25
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
