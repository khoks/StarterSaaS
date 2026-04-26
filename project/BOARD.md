# StarterSaaS — Live work board

> Read this first every session. The frontmatter in [`epics/`](./epics/), [`stories/`](./stories/), and [`tasks/`](./tasks/) is the authoritative source — this file is the human-readable summary, kept in sync by the `work-tracking` skill at session end.

**Last updated:** 2026-04-25 (Phase A bootstrap session)

---

## In progress

| ID | Title | Owner | Notes |
|---|---|---|---|
| EPIC-001 | Phase A bootstrap — repo, skills, tracking, GitHub | rahul | Phase A execution underway |
| STORY-001 | Folder skeleton + bootstrap directory tree | rahul | Folders created; awaiting `git init` to mark done |
| STORY-002 | CLAUDE.md + vision capture | rahul | CLAUDE.md done; RAW_VISION + placeholders in progress |
| STORY-003 | Three Claude Code skills + Stop hook | rahul | All three skill files + hook + settings written |
| STORY-004 | In-repo tracking system | rahul | Templates + epics + stories + BOARD written this session |
| STORY-005 | License, README, gitignore, gitattributes, .github | rahul | LICENSE + README + gitignore + gitattributes done; .github files pending |

---

## Up next

| ID | Title | Estimate | Why next |
|---|---|---|---|
| STORY-006 | GitHub remote — `gh repo create khoks/StarterSaaS --private` | S | Runs after all Phase A files are on disk |
| STORY-007 | End-to-end auto-PR validation cycle | S | Closes Phase A by proving the three-skill chain |

---

## Backlog (Phase B grooming)

| ID | Title | Phase | Why backlog |
|---|---|---|---|
| EPIC-002 | Phase B grooming — vision, requirements, architecture, tech stack | scaffolding | Starts after EPIC-001 closes |
| STORY-008 | Vision grooming — persona, differentiator, kit promise | scaffolding | Phase B; blocked by EPIC-001 |
| STORY-009 | Architecture grooming — tenancy, event bus, observability | scaffolding | Phase B; blocked by STORY-008, STORY-010 |
| STORY-010 | Tech-stack decision — backend / frontend / polyglot | scaffolding | Phase B; blocked by STORY-008 |
| STORY-011 | Cloud-target decision — AWS / GCP / both | scaffolding | Phase B; blocked by STORY-010 |
| STORY-012 | MVP-1 scope lockdown — pick ~6 subsystems | scaffolding | Phase C; blocked by STORY-008…STORY-011 |

---

## Recently done

(empty — first commit hasn't landed yet)

---

## Blocked

(none)

---

## Canceled

(none)

---

## Epic index

| Epic | Status | Phase | Stories |
|---|---|---|---|
| [EPIC-001](./epics/EPIC-001-bootstrap.md) | in-progress | scaffolding | STORY-001 → STORY-007 |
| [EPIC-002](./epics/EPIC-002-grooming.md) | backlog | scaffolding | STORY-008 → STORY-012 |

(EPIC-003+ for MVP-1 subsystems are created during STORY-012 Phase C lockdown.)

---

## Conventions

See [`README.md`](./README.md) for full conventions. Quick reference:

- **Status flow**: `backlog → todo → in-progress → review → done` (with `blocked` / `canceled` from any state)
- **Priorities**: P0 (critical) / P1 (important) / P2 (nice) / P3 (low)
- **Phases**: `scaffolding` / `mvp` / `v1` / `v2` / `v3`
- **Find in-progress items**: `grep -l "status: in-progress" project/{epics,stories,tasks}/*.md`
