# StarterSaaS — Live work board

> Read this first every session. The frontmatter in [`epics/`](./epics/), [`stories/`](./stories/), and [`tasks/`](./tasks/) is the authoritative source — this file is the human-readable summary, kept in sync by the `work-tracking` skill at session end.

**Last updated:** 2026-04-25 (Phase A bootstrap session — closure PR open)

---

## In progress

| ID | Title | Owner | Notes |
|---|---|---|---|
| EPIC-001 | Phase A bootstrap — repo, skills, tracking, GitHub | rahul | Awaits STORY-007 closure (closure PR auto-merge) |
| STORY-007 | End-to-end auto-PR validation cycle | rahul | Branch `auto/phase-a-closure-2026-04-25` open as PR; auto-merge gated on branch protection |

---

## Up next

| ID | Title | Estimate | Why next |
|---|---|---|---|
| _(empty for Phase A)_ | — | — | After STORY-007 closes, EPIC-002 grooming becomes Up Next |

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

| ID | Title | Closed | Notes |
|---|---|---|---|
| STORY-006 | GitHub remote — `gh repo create khoks/StarterSaaS --private` | 2026-04-25 | Private repo at https://github.com/khoks/StarterSaaS |
| STORY-005 | License, README, gitignore, gitattributes, .github files | 2026-04-25 | MIT license, full root meta + .github files |
| STORY-004 | In-repo tracking system | 2026-04-25 | `project/` conventions + templates + 2 epics + 12 stories + BOARD |
| STORY-003 | Three Claude Code skills + Stop hook | 2026-04-25 | `harvest-knowledge` + `work-tracking` + `auto-pr` chained via `.claude/settings.json` |
| STORY-002 | CLAUDE.md + vision capture | 2026-04-25 | CLAUDE.md + RAW_VISION.md (verbatim) + placeholders |
| STORY-001 | Folder skeleton + bootstrap directory tree | 2026-04-25 | Directory tree created; `git init` complete (commit `82ff650`) |

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
| [EPIC-001](./epics/EPIC-001-bootstrap.md) | in-progress | scaffolding | STORY-001 → STORY-007 (1–6 done, 7 in-progress) |
| [EPIC-002](./epics/EPIC-002-grooming.md) | backlog | scaffolding | STORY-008 → STORY-012 |

(EPIC-003+ for MVP-1 subsystems are created during STORY-012 Phase C lockdown.)

---

## Conventions

See [`README.md`](./README.md) for full conventions. Quick reference:

- **Status flow**: `backlog → todo → in-progress → review → done` (with `blocked` / `canceled` from any state)
- **Priorities**: P0 (critical) / P1 (important) / P2 (nice) / P3 (low)
- **Phases**: `scaffolding` / `mvp` / `v1` / `v2` / `v3`
- **Find in-progress items**: `grep -l "status: in-progress" project/{epics,stories,tasks}/*.md`
