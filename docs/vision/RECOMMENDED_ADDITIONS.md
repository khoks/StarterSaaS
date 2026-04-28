# Recommended additions

> Gaps the user did not explicitly mention in `RAW_VISION.md` but should consider. Maintained by the `harvest-knowledge` skill (and added to manually during grooming). Each entry is a *recommendation*, not a decision — Phase B grooming converts the worthy ones into Stories.

---

## Format

Each entry has:

- **Title** — one line
- **Why** — what gap it fills, what risk it mitigates
- **Cost estimate** — XS/S/M/L/XL
- **Phase fit** — which phase it most likely belongs to
- **Status** — `proposed` (default), `accepted` (becomes a Story), `rejected` (with reason), `deferred` (with reason and target phase)

---

## Proposed additions

### Migration path: graft existing app onto StarterSaaS

- **Why:** The primary persona ([D-13](../decisions/DECISIONS_LOG.md), founder's first engineer) typically inherits a half-built codebase rather than starting greenfield. Fresh-install flows aren't enough — adoption requires: importing an existing Postgres schema with FK preservation, wrapping an existing auth provider (e.g., a hand-rolled JWT or a Firebase auth they're trying to leave), retrofitting RBAC over a running app's models, and gradual subsystem-by-subsystem adoption (e.g., adopt notifications subsystem first, defer the gateway). Without this, "adopt StarterSaaS" effectively means "rewrite," which the first engineer can't sell to the founder.
- **Cost estimate:** L
- **Phase fit:** v1 (MVP-1 is fresh-install only; migration tooling lands once the core kit is stable)
- **Status:** proposed
- **Source:** STORY-008 Q1 lock discussion (2026-04-27)

<!--
Example template (uncomment when adding entries):

### Title — Audit log subsystem

- **Why:** No SaaS platform sells to enterprise without an audit log. The user's vision listed observability and ticketing but didn't call out tamper-evident audit trails. Without one, compliance reviews stall.
- **Cost estimate:** M
- **Phase fit:** v1 (post-MVP-1; auth + RBAC must land first)
- **Status:** proposed
-->

---

## Accepted (now Stories)

(empty — when proposals graduate, link to the Story under EPIC-002 or later)

## Rejected

(empty — entries here include the user's reason for rejection so future sessions don't re-propose)

## Deferred

(empty — entries here include the target phase and the trigger that would un-defer them)
