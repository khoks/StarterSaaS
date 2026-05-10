# @starter-saas/starter

Thin-shell adopter template. Adopters scaffold via `npx create-starter-saas` (per [ADR-0018](../../docs/architecture/ADR-0018-deploy-portal-mechanism.md)).

## Locked design

See [ADR-0002 (tech stack)](../../docs/architecture/ADR-0002-tech-stack.md):

- **Next.js App Router** for the app surface (per [D-27](../../docs/decisions/DECISIONS_LOG.md))
- RSC enforced default; SPA opt-in
- Brand integration via [`@starter-saas/brand`](../../packages/brand/) (per [STORY-029](../../project/stories/STORY-029-brand-package.md))
- ai-ui primitives from [`@starter-saas/ai-ui`](../../packages/ai-ui/) (per [STORY-023](../../project/stories/STORY-023-ai-ui-streaming-primitives.md))

## Status

**Placeholder** — established by [STORY-032](../../project/stories/STORY-032-monorepo-bootstrap.md) (Phase D monorepo bootstrap). Real Next.js scaffold lands progressively across the 6 MVP-1 Epics.
