# @starter-saas/gateway

Fastify-based HTTP gateway for StarterSaaS — opinionated factory per [D-24](../../CLAUDE.md) + [D-25](../../CLAUDE.md).

## What's in this package (STORY-016 sub-PR #1)

- **`createGateway(options)`** — Fastify v5 factory with:
  - Zod type provider wired up — `schema.body` / `schema.response` accept full Zod schemas; route handler `request.body` is typed automatically
  - Error handler that formats Zod validation failures as structured `400` responses (`{ error: "validation_error", issues: ZodIssue[] }`)
  - Kit-default `/health` route (Zod-schema'd response; opt out via `registerHealthRoute: false`)
- **`tenantContextPlugin`** — Fastify plugin that:
  - Decorates `request.tenantId` (string | null) via an adopter-supplied extractor (default reads `x-tenant-id` header)
  - Optionally registers the per-tenant rate-limit middleware from `@starter-saas/tenancy` as a `preHandler` (default 100 q/s per tenant)
- **`authContextPlugin`** (sub-PR #2) — Fastify plugin that:
  - Extracts a session token (default: `starter-saas-session` cookie OR `Authorization: Bearer <token>` header)
  - Resolves the token via an adopter-supplied `SessionResolver` (Auth.js session table / Redis / JWT verify)
  - Decorates `request.session` (`Session | null` from `@starter-saas/auth`) + `request.user` convenience alias
  - When `required: true`, emits structured 401 on missing/invalid sessions
  - Reconciles with `tenantContextPlugin`: session's `activeTenant.tenantId` overrides the header-extracted `request.tenantId`

## What's coming in later sub-PRs of STORY-016

- **Sub-PR #3** — `apps/starter` minimal entry running the gateway end-to-end with the auth + tenancy + provisioning-saga subsystems wired together

## Usage

```typescript
import { createGateway, tenantContextPlugin } from "@starter-saas/gateway";
import { z } from "zod";

const app = await createGateway({ fastify: { logger: true } });
await app.register(tenantContextPlugin, {
  rateLimit: { maxPerWindow: 100, windowMs: 1000 },
});

app.route({
  method: "POST",
  url: "/widgets",
  schema: {
    body: z.object({ name: z.string().min(2) }),
    response: { 200: z.object({ id: z.string() }) },
  },
  handler: async (request) => {
    // request.body.name is `string`
    // request.tenantId is `string | null` (from x-tenant-id header by default)
    return { id: "..." };
  },
});

await app.listen({ port: 3000 });
```

## Status

**In progress** — [STORY-016](../../project/stories/STORY-016-fastify-gateway.md). This package + tenant-context plugin land in sub-PR #1; auth-context plugin + adopter-facing `apps/starter` follow in sub-PRs #2 + #3.
