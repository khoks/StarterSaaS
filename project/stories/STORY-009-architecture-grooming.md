---
id: STORY-009
title: Architecture grooming — multi-tenancy, event bus, observability
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-002
phase: scaffolding
tags: [grooming, architecture, phase-b]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As an engineer (the user's eng hat), I need the cross-cutting architecture decisions locked: multi-tenancy isolation (shared-DB / schema-per-tenant / DB-per-tenant), event bus (Postgres NOTIFY / Redis Streams / Kafka), saga choreography pattern, observability stack (OpenTelemetry default + which backend), data-quality framework, and plugin / extension architecture. Each lands as an ADR.

## Acceptance criteria

- [ ] ADR-0004 multi-tenancy model accepted
- [ ] ADR-0005 event bus selection accepted
- [ ] ADR-0006 observability stack accepted
- [ ] Saga choreography pattern documented in `docs/architecture/ARCHITECTURE.md`
- [ ] Plugin / extension architecture sketched (even if v2 will refine)
- [ ] Data-quality approach (per-table rules / lineage-aware / contract-based) decided and documented

## Tasks under this Story

(Tasks created on demand during grooming.)

## Dependencies

- Blocks: STORY-012 (MVP-1 surface)
- Blocked by: STORY-008, STORY-010

## Notes

These decisions interact: tenancy choice constrains event-bus throughput requirements; observability default depends on whether self-hosted-first or vendor-first; plugin architecture depends on whether tenancy is shared-DB or DB-per-tenant. Discuss in dependency order.

## Activity log

- 2026-04-25 — created (Phase B placeholder)
