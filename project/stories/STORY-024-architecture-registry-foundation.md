---
id: STORY-024
title: Architecture registry foundation — auto-discovery + queryable API
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-006
phase: mvp
tags: [mvp, architecture-registry, ai-foundation]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Build the `platform.architecture_registry` foundation per [ADR-0012](../../docs/architecture/ADR-0012-ai-coworker-internal-ops.md). Auto-populated from kit's package.json dependency graph + adopter packages + Drizzle schemas + Zod boundaries + ADR file scan. Tracks per-component: endpoints, API schemas (Zod), event schemas, responsibilities (markdown), current versions, adapter-for-relationships. Refreshed on `cli doctor --refresh-architecture` (manual), post-deploy hook (auto), detected schema migration (auto via [D-44](../../docs/decisions/DECISIONS_LOG.md)). Provides queryable API used by AI-first features (STORY-025/026/027).

## Acceptance criteria

- [ ] `platform.architecture_registry` schema created
- [ ] Auto-discovery from `package.json` graph (kit + adopter packages)
- [ ] Drizzle schema introspection extracts table-level contracts
- [ ] Zod schema collection from endpoint + event boundaries (per [D-25](../../docs/decisions/DECISIONS_LOG.md))
- [ ] ADR file scan extracts high-level component responsibilities
- [ ] Refresh job runs as a saga (per [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md)) — resumable across very-large package graphs
- [ ] `cli doctor --refresh-architecture` triggers manual refresh
- [ ] Post-deploy hook triggers auto refresh
- [ ] Schema migration detection auto-refreshes
- [ ] Queryable TS API: `registry.findComponent(id)`, `registry.findExtensionPoints(component)`, `registry.findAdaptersFor(contract)`
- [ ] Integration test: kit + adopter package added → registry refresh → component appears with all metadata

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: STORY-025 (AI config gen needs adapter catalog); STORY-026 (AI-assisted merge needs signature extraction); STORY-027 (AI-validated plugin compat needs ext-point spec)
- Blocked by: STORY-014 (`platform` schema); STORY-017 (event bus + saga primitives)

## Related

- ADRs: [ADR-0012](../../docs/architecture/ADR-0012-ai-coworker-internal-ops.md)
- Decisions: D-25, D-53

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
