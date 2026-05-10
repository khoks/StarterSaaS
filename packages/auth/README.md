# @starter-saas/auth

Auth subsystem for StarterSaaS. Implementation tracked in [STORY-013](../../project/stories/STORY-013-auth-flows-mvp1.md).

## Locked design

See [ADR-0007 — Auth provider](../../docs/architecture/ADR-0007-auth-provider.md):

- **Auth.js v5+** with Drizzle adapter
- Auth tables in `platform.{users, sessions, accounts, verification_tokens}` plus `platform.{user_tenant, user_tenant_invites, audit_log}`
- Tenant-aware sessions via `platform.user_tenant` (many-to-many)
- Flows MVP-1: email + password / magic link / OAuth (Google / GitHub / Apple) / TOTP 2FA
- v1+ adapters: Clerk / Auth0 / AWS Cognito / GCP Identity Platform / WorkOS / Authelia / Ory Kratos

## Current shape (STORY-013 sub-PR #1)

```text
src/
├── db/
│   └── schema.ts            # Drizzle schemas for the 7 platform auth tables
├── contracts/
│   ├── session.ts           # Zod: session shape (user + activeTenant + expires)
│   ├── user.ts              # Zod: signup / signin / password-reset / magic-link inputs
│   ├── audit.ts             # Zod: audit-log entry shape + AuditAction union
│   └── index.ts             # Public contract re-exports
└── index.ts                 # Public entry — exports schema + contracts
```

## Public API (this PR)

```typescript
import { schema, SessionSchema, SignUpInputSchema } from "@starter-saas/auth";
import { users, accounts } from "@starter-saas/auth/db/schema";
import { AuditActionSchema } from "@starter-saas/auth/contracts";
```

All schemas / contracts are **Zod-validated boundary types** per [D-25](../../docs/decisions/DECISIONS_LOG.md). Internal code is strict TypeScript without runtime Zod validation; only public boundaries enforce.

## Coming in subsequent sub-PRs

| Sub-PR | Scope |
|---|---|
| #2 | Auth.js v5 wiring + email + password flow (sign-up + sign-in + sign-out + verification + password reset) |
| #3 | Magic link + OAuth (Google / GitHub / Apple) flows |
| #4 | TOTP 2FA + audit-log writer + RBAC middleware |

## Test

```bash
npm test -w @starter-saas/auth
```

Smoke tests cover the Zod contracts. Real integration tests against a live Postgres land with sub-PR #2.

## Status

**In progress** — see [STORY-013](../../project/stories/STORY-013-auth-flows-mvp1.md).
