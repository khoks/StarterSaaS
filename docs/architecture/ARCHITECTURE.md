# StarterSaaS — Architecture

> **Status: stub.** Filled in during Phase B grooming (EPIC-002, STORY-009). Do not implement subsystems before this document is complete and the corresponding ADRs (ADR-0002+) are accepted.

---

## What this doc will eventually contain

Once Phase B grooming is complete, this document will cover:

1. **System context** — who uses StarterSaaS, what they install, what they configure, what they get
2. **Container view** — the major running pieces (gateway, app, worker, DB, cache, object store, observability stack) and how they talk
3. **Per-subsystem design** — for each MVP-1 subsystem (locked in STORY-012), a section covering: responsibility, public interface, data model, dependencies, scaling profile, and the relevant ADR
4. **Cross-cutting concerns** — multi-tenancy (ADR-0004), auth flow (ADR-TBD), event bus (ADR-0005), observability (ADR-0006), error/retry strategy, idempotency
5. **Pluggability boundaries** — the interfaces founders override (`SandboxProvider`, `LLMProvider`, `NotificationChannel`, `ObjectStore`, `Auth`, `Telemetry` — final names locked in STORY-009)
6. **Multi-cloud abstraction** — how `infra/aws/*` and `infra/gcp/*` share modules (decided in STORY-011)
7. **Deployment topology** — what `scripts/deploy.sh` actually does, end-to-end, on each cloud
8. **Failure modes** — what happens when each subsystem fails and how the others stay up

---

## Currently locked decisions

| Area | Decision | ADR |
|---|---|---|
| License | MIT | [ADR-0001](./ADR-0001-license-mit.md) |
| Tech stack | TBD (Phase B) | TBD |
| Cloud target | TBD (Phase B) | TBD |
| Multi-tenancy model | TBD (Phase B) | TBD |
| Event bus | TBD (Phase B) | TBD |
| Observability stack | TBD (Phase B) | TBD |

---

## How this doc evolves

- Every architectural change requires an ADR (`ADR-NNNN-short-slug.md`) in this directory.
- This file links to the ADRs and summarizes the resulting architecture; ADRs are the authoritative source for each individual decision.
- The `harvest-knowledge` skill updates this file when conversations introduce architectural insight.

---

## Until Phase B is done

Don't speculate about the architecture in code. Read [`../vision/RAW_VISION.md`](../vision/RAW_VISION.md) for the vision, [`../../project/BOARD.md`](../../project/BOARD.md) for what's actively being worked on, and [`../decisions/DECISIONS_LOG.md`](../decisions/DECISIONS_LOG.md) for the running decisions list.
