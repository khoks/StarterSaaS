---
id: STORY-009
title: Architecture grooming — multi-tenancy, event bus, observability
type: story
status: in-progress
priority: P0
estimate: XL
parent: EPIC-002
phase: scaffolding
tags: [grooming, architecture, phase-b]
created: 2026-04-25
updated: 2026-05-02
---

## Description

As an engineer (the user's eng hat), I need the cross-cutting architecture decisions locked: multi-tenancy isolation (shared-DB / schema-per-tenant / DB-per-tenant), event bus (Postgres NOTIFY / Redis Streams / Kafka), saga choreography pattern, observability stack (OpenTelemetry default + which backend), data-quality framework, and plugin / extension architecture. Each lands as an ADR.

## Acceptance criteria

### Original ACs (from STORY-009 spec)

- [x] **ADR-0004** multi-tenancy detail accepted (per-schema migration runner + cross-schema query primitives + tenant-provisioning flow; extends D-33) — *locked 2026-05-02 as D-44; ADR-0004 written and accepted*
- [ ] **ADR-0005** event bus selection accepted (Postgres NOTIFY / Redis Streams / Kafka)
- [ ] **ADR-0006** observability stack accepted (OTel + backend default + LLM-trace extension; extends D-38)
- [ ] Saga choreography pattern documented in `docs/architecture/ARCHITECTURE.md`
- [ ] Plugin / extension architecture sketched (extends D-20 layered)
- [ ] Data-quality approach (per-table rules / lineage-aware / contract-based) decided and documented

### Absorbed from STORY-008 / STORY-010 / STORY-011 grooming (queued ADRs)

- [ ] **ADR-0007** auth provider strategy (self-hosted Auth.js / Authelia / Ory vs. third-party adapter Auth0 / Clerk)
- [ ] **ADR-0008** AI Subsystem 1 — Event-driven Customer Profile Builder + AI-Native Stores (D-15 Sub 1)
- [ ] **ADR-0009** AI Subsystem 2 — Context-Resolving Query Service (D-15 Sub 2)
- [ ] **ADR-0010** AI Subsystem 3 — Agent Platform + Omnichannel Orchestrator with 6 registries (D-15 Sub 3)
- [ ] **ADR-0011** AI Subsystem 4 — LLM Gateway + Safety + Model Hub + Eval/Cost (D-15 Sub 4; foundational MVP-1)
- [ ] **ADR-0012** AI Subsystem 5 — AI Coworker Platform for Internal Ops (D-15 Sub 5; v2 with merge-helper subset MVP-1)
- [ ] **ADR-0013** Plugin extension-point machine-readable spec + AI-validated compat methodology (extends D-23)
- [ ] **ADR-0014** AI-assisted upstream merge mechanism — adapter usage signatures + confidence scoring + sandbox sim (extends D-17)
- [ ] **ADR-0015** AI-assisted config generation mechanism — NL → schema validation + adapter recommendation + hallucination guardrails (extends D-22)
- [ ] **ADR-0016** AI-streaming UI primitives integration with AI Sub 3 + LLM Gateway (extends D-29)
- [ ] **ADR-0017** Status-page adapter pattern + brand-package mechanism + admin-UI adapter (extends D-18, D-19, D-20)
- [ ] **ADR-0018** Deploy command portal mechanism — local web/TUI server + pause/resume state machine + AI narration prompt design (extends D-43)
- [ ] **ML platform** decision (pluggable / vendor-default / deferred to v2)

### Notes

- Story may split if AC count remains unmanageable. Reasonable split-points: ADR-0004..0007 (core architecture) → STORY-009A; ADR-0008..0012 (AI subsystems) → STORY-009B; ADR-0013..0018 (plugin / AI-mechanisms / cross-cutting) → STORY-009C.
- ADRs may land as `status: proposed` initially and be promoted to `accepted` as designs solidify. Goal is to lock the *direction*, not the implementation detail.
- Story estimate bumped from L → XL to reflect the absorbed ADRs.

## Tasks under this Story

(Tasks created on demand during grooming.)

## Dependencies

- Blocks: STORY-012 (MVP-1 surface)
- Blocked by: STORY-008, STORY-010

## Notes

These decisions interact: tenancy choice constrains event-bus throughput requirements; observability default depends on whether self-hosted-first or vendor-first; plugin architecture depends on whether tenancy is shared-DB or DB-per-tenant. Discuss in dependency order.

## Activity log

- 2026-04-25 — created (Phase B placeholder)
- 2026-05-02 — picked up; STORY-008 + STORY-010 + STORY-011 closed (32 decisions D-12..D-43; 3 ADRs accepted: ADR-0001 license, ADR-0002 tech stack, ADR-0003 cloud target). ACs expanded to absorb the ADR queue accumulated during prior stories — ADR-0004 (multi-tenancy) through ADR-0018 (deploy command portal mechanism). Story estimate bumped L → XL. **Likely-split planned**: STORY-009A core architecture (ADR-0004..0007 + saga + data-quality), STORY-009B AI subsystems (ADR-0008..0012), STORY-009C plugin + AI-mechanisms + cross-cutting (ADR-0013..0018). First question: **ADR-0004 multi-tenancy detail** — per-schema migration runner + cross-schema query primitives + tenant provisioning flow (D-33 already locked schema-per-tenant; this fleshes out the *how*).
- 2026-05-02 — **Pacing strategy locked** via AskUserQuestion: tight bundling (5-7 broader Qs grouping related ADRs) over per-ADR full treatment or split-now.
- 2026-05-02 — **Q1 locked** (ADR-0004 multi-tenancy detail): all 4 sub-areas + 6 side picks per assistant recommendation. Migration runner = `@starter-saas/cli tenant migrate` with default-5 parallelism + continue-on-error. Cross-schema queries = `platform` schemas + `withTenants()` wrapper (federated views rejected). Connection pool = PgBouncer transaction mode + per-tenant 100 q/s rate-limit middleware. Tenant provisioning = 9-step idempotent + compensating saga (drives ADR-0005 event-bus design). Archival = 2-stage (soft archive immediate + 30-day default hard-delete retention) with `legal_hold` flag for GDPR. Side picks: UUIDv7 tenant ID, `tenant_{uuid}` schema names, co-resident `platform` schemas, all configurables tunable in `starter.config.ts`. Logged as **D-44**; **ADR-0004 written and accepted** at `docs/architecture/ADR-0004-multi-tenancy.md`. ACs ticked: ADR-0004 ✓ (1 of ~14). Next: **Q2 — ADR-0005 event bus + saga choreography pattern** (Postgres NOTIFY / Redis Streams / Kafka).
