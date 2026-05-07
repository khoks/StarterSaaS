---
id: STORY-014
title: Tenancy schema + 9-step provisioning saga + multi-tenant query primitives
type: story
status: backlog
priority: P0
estimate: XL
parent: EPIC-003
phase: mvp
tags: [mvp, tenancy, saga, multi-tenant]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Implement the schema-per-tenant tenancy infrastructure per [ADR-0004](../../docs/architecture/ADR-0004-multi-tenancy.md): platform schemas (`platform.{tenants, user_tenant, tenant_migrations, saga_instances, audit_log, ...}`), 9-step tenant provisioning saga with idempotent + compensating + observable properties, cross-schema query primitives (TS-side `withTenants()` wrapper), per-tenant rate-limit middleware in Fastify (default 100 q/s).

## Acceptance criteria

- [ ] Platform schema tables created via initial Drizzle migration
- [ ] 9-step provisioning saga implemented with compensation registry (per ADR-0004)
- [ ] Saga is idempotent (resume from last incomplete step)
- [ ] Each step emits a step event to event bus (per [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md))
- [ ] Tenant ID format = UUIDv7; schema name = `tenant_{uuid}` literal
- [ ] `withTenants()` wrapper utility ships in `@starter-saas/data`
- [ ] Per-tenant rate-limit middleware in Fastify (default 100 q/s; configurable)
- [ ] PgBouncer transaction-mode pool tested under load
- [ ] Integration test: tenant signup → saga runs end-to-end → tenant active → cross-tenant query blocked

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: every other Phase D Story that needs tenant context
- Blocked by: STORY-013 (Auth must exist for `platform.user_tenant` foreign keys); STORY-017 (event bus must exist for saga step events)

## Related

- ADRs: [ADR-0004](../../docs/architecture/ADR-0004-multi-tenancy.md), [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md)
- Decisions: D-32, D-33, D-44, D-45

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
