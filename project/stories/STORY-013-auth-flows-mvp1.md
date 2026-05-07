---
id: STORY-013
title: Auth.js v5 integration with Drizzle adapter — MVP-1 sign-in flows
type: story
status: backlog
priority: P0
estimate: L
parent: EPIC-003
phase: mvp
tags: [mvp, auth, identity]
created: 2026-05-06
updated: 2026-05-06
---

## Description

Integrate Auth.js v5+ with the kit's Drizzle data layer per [ADR-0007](../../docs/architecture/ADR-0007-auth-provider.md). Ship MVP-1 auth flows: email + password (bcrypt cost 12 + 12-char min + HIBP breach-check opt-in), magic link (passwordless email-driven), OAuth (Google / GitHub / Apple — adopter declares which providers in `starter.config.ts`), and TOTP 2FA. Auth tables live in `platform` schema (`platform.{users, sessions, accounts, verification_tokens}`).

## Acceptance criteria

- [ ] Auth.js v5+ installed and configured with Drizzle adapter
- [ ] `platform.{users, sessions, accounts, verification_tokens}` migrations land
- [ ] Email + password flow works end-to-end (sign-up → email verify → sign-in → forgot-password → reset)
- [ ] Magic link flow works end-to-end
- [ ] OAuth providers (Google + GitHub + Apple) configurable via `starter.config.ts`
- [ ] TOTP 2FA enrollment + verification flow with kit React components from `packages/auth-ui`
- [ ] `platform.audit_log` writer captures sign-in / sign-out / password change events
- [ ] DB-backed sessions (default); JWT mode opt-in via `starter.config.ts`
- [ ] Session shape Zod-validated and exported from `packages/auth/src/contracts/session.ts`

## Tasks under this Story

(Decomposed in Phase D as work begins.)

## Dependencies

- Blocks: STORY-014 (provisioning saga seeds default RBAC roles tied to user identity)
- Blocked by: EPIC-004 (event bus needed for audit-log event publishing)

## Related

- ADRs: [ADR-0007](../../docs/architecture/ADR-0007-auth-provider.md)
- Decisions: D-13, D-25, D-32, D-48

## Activity log

- 2026-05-06 — created as part of [STORY-012](./STORY-012-mvp1-scope-lockdown.md) Q2 Story decomposition
