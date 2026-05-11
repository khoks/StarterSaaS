# @starter-saas/saga

Saga primitives — TS-coded state machines with compensation registry. Per [D-45](../../docs/decisions/DECISIONS_LOG.md) / [ADR-0005](../../docs/architecture/ADR-0005-event-bus.md). Event-driven choreography over [`@starter-saas/event-bus`](../event-bus/).

## What's in this package (STORY-014 sub-PR #1)

- `SagaDefinition<State>` + `SagaStep<State>` — the core contract: an ordered list of steps, each with `execute` + optional `compensate`.
- `SagaInstance<State>` — per-run snapshot for persistence + observability.
- `SagaStore` interface — pluggable persistence. Ships with `InMemorySagaStore` for tests.
- `SagaRunner` — synchronous in-process runner. Walks steps; on failure, walks compensations in reverse.

## What's coming in later Stories

- `DrizzleSagaStore` writing to `platform.saga_instances` — STORY-014 sub-PR #2 (tenancy schemas).
- **Event-driven runner** that dispatches step events via `@starter-saas/event-bus` — STORY-017 (event-bus production adapter). Same `SagaDefinition` shape; only the dispatcher changes.

## Usage

```typescript
import {
  InMemorySagaStore,
  SagaRunner,
  type SagaDefinition,
} from "@starter-saas/saga";

interface TenantProvisioningState {
  tenantId: string;
  schemaName: string;
  defaultRolesSeeded: boolean;
}

const tenantProvisioningSaga: SagaDefinition<TenantProvisioningState> = {
  name: "tenant.provisioning",
  steps: [
    {
      name: "reserve-tenant-id",
      execute: async (s) => ({ ...s, tenantId: crypto.randomUUID() }),
      compensate: async (s) => { /* delete the reservation */ },
    },
    {
      name: "create-schema",
      execute: async (s) => { /* CREATE SCHEMA tenant_xyz */ return s; },
      compensate: async (s) => { /* DROP SCHEMA */ },
    },
    // ... 7 more steps per ADR-0004 9-step saga
  ],
};

const store = new InMemorySagaStore();
const runner = new SagaRunner(store);

const result = await runner.run(tenantProvisioningSaga, {
  tenantId: "",
  schemaName: "",
  defaultRolesSeeded: false,
});

if (result.ok) {
  console.log("provisioned:", result.finalState);
} else {
  console.error(`failed at ${result.failedStep}: ${result.reason}`);
  console.error(`compensated: ${result.compensatedSteps.join(", ")}`);
  console.error(`final status: ${result.finalStatus}`);
}
```

## Failure semantics

| Outcome | `status` | What ran |
|---|---|---|
| All steps succeed | `completed` | Every step's `execute` |
| Step N fails | `compensating` → `compensated` | `execute` of 0..N-1; `compensate` of N-1..0 (in reverse) |
| Step N fails AND a compensation itself errors | `failed` | Partial compensation; rest of the rollback skipped; manual intervention required |

## Status

**In progress** — [STORY-014](../../project/stories/STORY-014-tenancy-provisioning-saga.md) sub-PR #1. Tests cover happy-path, mid-saga failure with full compensation, compensation that itself fails (failed status), persistence-via-store, and skipping steps without a registered `compensate`.
