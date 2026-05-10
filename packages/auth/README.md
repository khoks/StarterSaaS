# @starter-saas/auth

Auth subsystem for StarterSaaS. Implementation lands in [STORY-013](../../project/stories/STORY-013-auth-flows-mvp1.md).

## Locked design

See [ADR-0007 — Auth provider](../../docs/architecture/ADR-0007-auth-provider.md):

- **Auth.js v5+** with Drizzle adapter
- Auth tables in `platform.{users, sessions, accounts, verification_tokens}`
- Tenant-aware sessions via `platform.user_tenant`
- Flows MVP-1: email + password / magic link / OAuth (Google / GitHub / Apple) / TOTP 2FA
- v1+ adapters: Clerk / Auth0 / AWS Cognito / GCP Identity Platform / WorkOS / Authelia / Ory Kratos

## Status

**Placeholder** — established by [STORY-032](../../project/stories/STORY-032-monorepo-bootstrap.md) (Phase D monorepo bootstrap). Empty source export; real implementation lands in STORY-013.
