---
id: STORY-021
title: Built-in lightweight status page + Instatus adapter + default alerts
type: story
status: backlog
priority: P0
estimate: M
parent: EPIC-005
phase: mvp
tags: [mvp, status-page, alerts, observability]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Ship the public-facing status page surface per [D-19](../../docs/decisions/DECISIONS_LOG.md) and [ADR-0017](../../docs/architecture/ADR-0017-status-brand-admin.md). Built-in lightweight self-hosted status page (read-only React app deployed to `status.<adopter-domain>` via Pulumi); Instatus managed adapter (push incident updates to Instatus API). Both subscribe to `platform.incident` topic on event bus. Standard 4-tier severity (operational / degraded / partial outage / major outage). Plus default kit alerts (deploy failure, saga DLQ growth, budget breach, error rate spike) → adopter's existing alerting via webhook adapter.

## Acceptance criteria

- [ ] `packages/status-page-builtin` ships a minimal React app
- [ ] Status page deploys to `status.<adopter-domain>` via Pulumi
- [ ] Status page subscribes to `platform.incident` topic; auto-updates display
- [ ] `packages/status-page-instatus` adapter pushes incidents to Instatus API
- [ ] Adopter selects adapter via `starter.config.ts → status_page: { adapter: ... }`
- [ ] 4-tier severity (operational / degraded / partial outage / major outage) supported
- [ ] Default alerts ship: deploy failure, saga DLQ growth, budget breach, error rate spike
- [ ] Alerts dispatch via webhook adapter (adopter configures Slack / Discord / PagerDuty / etc.)
- [ ] Integration test: trigger synthetic incident → event on bus → status page updates + Instatus pushed + alert webhook fires

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: nothing (independent leaf)
- Blocked by: STORY-019 (observability foundation); STORY-017 (event bus); STORY-031 (Pulumi deploy infrastructure)

## Related

- ADRs: [ADR-0006](../../docs/architecture/ADR-0006-observability.md), [ADR-0017](../../docs/architecture/ADR-0017-status-brand-admin.md)
- Decisions: D-19, D-49

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
