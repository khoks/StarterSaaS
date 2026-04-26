# Roadmap

> Phased delivery. Each phase has a clear scope, a clear exit, and a clear handoff to the next.

---

## Phase A — Bootstrap (current)

**Status:** in progress
**Driver:** EPIC-001
**Goal:** Stand up the StarterSaaS repo, the three-skill housekeeping chain (`harvest-knowledge` → `work-tracking` → `auto-pr`), the JIRA-style tracking system, the GitHub remote, the MIT license, and prove one end-to-end auto-PR cycle.

**Exit criteria:**
- All seven Phase A stories `status: done` ([STORY-001](../../project/stories/STORY-001-folder-skeleton.md)…[STORY-007](../../project/stories/STORY-007-initial-auto-pr-cycle.md))
- `gh repo view khoks/StarterSaaS` opens the private repo
- At least one PR opened by `auto-pr` and auto-merged

**No code lands in this phase.** Doc + tracking + tooling only.

---

## Phase B — Grooming (next)

**Status:** backlog
**Driver:** EPIC-002 (STORY-008…STORY-011)
**Goal:** Lock vision, requirements, architecture, tech stack, and cloud target through heavy interactive PM + engineer discussion. No code yet.

**Output:**
- `GROOMED_FEATURES.md` complete (MVP/v1/v2/v3 tagged)
- `ARCHITECTURE.md` replaces stub with full content
- ADR-0002 (stack), ADR-0003 (cloud), ADR-0004 (multi-tenancy), ADR-0005 (event bus), ADR-0006 (observability) all `status: accepted`
- `NOVEL_IDEAS.md` populated with anything genuinely innovative the user surfaces
- `RECOMMENDED_ADDITIONS.md` populated with gaps the assistant identifies

**Exit criteria:** all of EPIC-002 except STORY-012 done.

---

## Phase C — MVP-1 lockdown

**Status:** backlog
**Driver:** STORY-012 (last story under EPIC-002)
**Goal:** Pick exactly the ~6 MVP-1 subsystems. Spawn one Epic per chosen subsystem (EPIC-003…EPIC-008). Decompose each into Stories (3+ per Epic). Lock `MVP.md` v1.

**Output:**
- `MVP.md` v1 complete
- EPIC-003 through ~EPIC-008 created, each with Stories drafted
- BOARD reflects the new Phase D shape

**Exit criteria:** STORY-012 done, EPIC-002 closed, BOARD shows Phase D Epics ready.

---

## Phase D — MVP-1 build

**Status:** backlog
**Driver:** EPIC-003+ (one per chosen subsystem)
**Goal:** Implement the thin vertical slice end-to-end with one-script deploy.

**Cadence:**
- Each Story executed via the discipline established in Phase A: pick from BOARD → set in-progress → code → tests → auto-PR cycle → BOARD updated → next Story
- Each architectural surprise gets a new ADR (ADR-0007+)
- Each novel-idea moment lands in `NOVEL_IDEAS.md`
- Each scope drift gets a Story (or rejected, with reason in `RECOMMENDED_ADDITIONS.md`)

**Output:**
- Working one-script deploy on the chosen cloud
- All MVP-1 subsystems shipped
- A founder can clone → white-label → deploy → log in

**Exit criteria:** all `MVP.md` exit criteria met. See [`MVP.md`](./MVP.md) § Exit criteria.

---

## Beyond MVP-1

- **v1** — billing, marketing site, mobile, second cloud (if MVP-1 was single-cloud), developer portal
- **v2** — ML platform, conversational care chatbot, saga DSL, plugin architecture refinement
- **v3** — full multi-tenant enterprise mode (DB-per-tenant option), advanced data-quality, audit / compliance pack

These are sketches, not commitments. Locked one-at-a-time as v1 ships and feedback rolls in.

---

## Phase summary table

| Phase | Scope | Driver | Status |
|---|---|---|---|
| A — Bootstrap | Repo + skills + tracking + GitHub | EPIC-001 | in-progress |
| B — Grooming | Vision + arch + stack + cloud | EPIC-002 (STORY-008…011) | backlog |
| C — MVP-1 lockdown | Pick ~6 subsystems, draft Stories | STORY-012 | backlog |
| D — MVP-1 build | Implement thin vertical slice | EPIC-003+ | backlog |
| v1 | Billing, marketing, mobile, second cloud | EPIC-TBD | future |
| v2 | ML platform, chatbot, saga DSL | EPIC-TBD | future |
| v3 | Enterprise multi-tenant, compliance | EPIC-TBD | future |
