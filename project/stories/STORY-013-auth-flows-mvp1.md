---
id: STORY-013
title: Auth.js v5 integration with Drizzle adapter — MVP-1 sign-in flows
type: story
status: in-progress
priority: P0
estimate: L
parent: EPIC-003
phase: mvp
tags: [mvp, auth, identity]
created: 2026-05-06
updated: 2026-05-10
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
- 2026-05-10 — picked up after STORY-032 (monorepo bootstrap) closed. Sub-PR plan: (1) Drizzle schemas + Zod contracts + ESLint/Prettier configs scaffolds the data layer + boundary types; (2) Auth.js v5 wiring + email+pwd flow; (3) magic link + OAuth flows; (4) TOTP 2FA + audit-log writer + RBAC middleware. Each sub-PR self-contained + admin-merged per D-57.
- 2026-05-10 — **Sub-PR #1 landed** (PR #25): Drizzle schemas (7 `platform` tables) + Zod contracts (session/user/audit) + ESLint/Prettier configs + 15 contract tests. PR #26 install verification: lockfile + packageManager field + EmailSchema chain-order fix.
- 2026-05-10 — **Sub-PR #2 in progress**: email+pwd flow shipped without `@auth/core` (deferred to sub-PR #3 alongside OAuth where it actually pulls weight). Added bcryptjs + postgres + `@types/bcryptjs` deps. New modules: `src/crypto/{password,tokens}.ts`, `src/email/{email-sender,templates}.ts`, `src/flows/{sign-up,sign-in,sign-out,verify-email,password-reset}.ts`, `src/config/defaults.ts`, `src/types.ts`. Public flow API: `signUp / signIn / signOut / verifyEmail / requestPasswordReset / completePasswordReset` — each takes `AuthDeps = { db, emailSender, config }` for dependency injection. **Test count: 30 (15 contracts + 5 password + 9 tokens + 1 defaults)**; all pass. Typecheck green. Pure-function design keeps flows framework-agnostic — adopter wires into Fastify / Next App Router in their shell. TOTP-enrolled users currently get `totp-required` error (TOTP verification ships sub-PR #4).
- 2026-05-10 — **Sub-PR #3 in progress** (PR #28): magic-link flow shipped. New module `src/flows/magic-link.ts` (`requestMagicLink` + `verifyMagicLink`); follows the same DI pure-function pattern as sub-PR #2. Token identifier prefix `magic:` distinguishes from email-verification (no prefix) + password-reset (`pwreset:`). TTL 15 minutes (intentionally short — magic link grants immediate session vs. password-reset which only enables a password change action). New `magicLinkEmail` template. Magic-link sign-in implicitly verifies the email if not already verified. TOTP-enrolled users still get `totp-required` (sub-PR #5). **Scope change vs. original sub-PR plan**: OAuth (Google / GitHub / Apple) split out to sub-PR #4 — magic-link fits the pure-function shape, OAuth needs `@auth/core` HTTP wiring and benefits from its own focused PR. Test count: 33 (15 contracts + 5 password + 9 tokens + 1 defaults + 3 templates); all pass.
