# @starter-saas/auth

Auth subsystem for StarterSaaS. Implementation tracked in [STORY-013](../../project/stories/STORY-013-auth-flows-mvp1.md).

## Locked design

See [ADR-0007 — Auth provider](../../docs/architecture/ADR-0007-auth-provider.md):

- **Auth.js v5+** with Drizzle adapter
- Auth tables in `platform.{users, sessions, accounts, verification_tokens}` plus `platform.{user_tenant, user_tenant_invites, audit_log}`
- Tenant-aware sessions via `platform.user_tenant` (many-to-many)
- Flows MVP-1: email + password / magic link / OAuth (Google / GitHub / Apple) / TOTP 2FA
- v1+ adapters: Clerk / Auth0 / AWS Cognito / GCP Identity Platform / WorkOS / Authelia / Ory Kratos

## Current shape (STORY-013 sub-PRs #1 + #2)

```text
src/
├── db/
│   └── schema.ts            # Drizzle schemas for the 7 platform auth tables
├── contracts/               # Zod boundary contracts (D-25)
│   ├── session.ts
│   ├── user.ts
│   ├── audit.ts
│   └── index.ts
├── crypto/
│   ├── password.ts          # bcrypt hash + verify (cost 12 default per ADR-0007)
│   └── tokens.ts            # CSPRNG token generation + expiry helpers
├── email/
│   ├── email-sender.ts      # EmailSender interface + noopEmailSender default
│   └── templates.ts         # verification + password-reset email templates
├── flows/                   # pure dependency-injected flow functions
│   ├── sign-up.ts           # validate → check email-unique → hash → insert user → verification token → send email
│   ├── sign-in.ts           # validate → verify password → TOTP check → email-verified check → create session
│   ├── sign-out.ts          # idempotent session delete
│   ├── verify-email.ts      # consume one-time verification token + mark emailVerified
│   └── password-reset.ts    # requestPasswordReset (enum-safe) + completePasswordReset
├── config/
│   └── defaults.ts          # defaultAuthConfig matching ADR-0007 / D-48
├── types.ts                 # AuthDeps, AuthResult, AuthError, EmailSender, AuthConfig
└── index.ts                 # public entry
```

## Public API

```typescript
import {
  signUp, signIn, signOut, verifyEmail,
  requestPasswordReset, completePasswordReset,
  hashPassword, verifyPassword,
  generateToken, isStillValid,
  noopEmailSender, defaultAuthConfig,
  SessionSchema, SignUpInputSchema, AuditActionSchema,
  type AuthDeps, type AuthConfig, type EmailSender,
} from "@starter-saas/auth";
```

Every flow takes `AuthDeps = { db, emailSender, config }`. The package is framework-agnostic; HTTP routes / RSC actions in the adopter shell wire these into Fastify or Next App Router as needed.

## Coming in subsequent sub-PRs

| Sub-PR | Scope |
|---|---|
| #3 | OAuth (Google / GitHub / Apple) flows + `@auth/core` integration for provider wiring + magic link |
| #4 | TOTP 2FA enrollment + verification + audit-log writer + account lockout + RBAC middleware |

## Test

```bash
npm test -w @starter-saas/auth
```

Smoke tests cover the Zod contracts. Real integration tests against a live Postgres land with sub-PR #2.

## Status

**In progress** — see [STORY-013](../../project/stories/STORY-013-auth-flows-mvp1.md).
