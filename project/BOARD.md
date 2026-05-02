# StarterSaaS — Live work board

> Read this first every session. The frontmatter in [`epics/`](./epics/), [`stories/`](./stories/), and [`tasks/`](./tasks/) is the authoritative source — this file is the human-readable summary, kept in sync by the `work-tracking` skill at session end.

**Last updated:** 2026-04-28 (STORY-008 closed; STORY-010 in progress)

---

## In progress

| ID | Title | Owner | Notes |
|---|---|---|---|
| EPIC-002 | Phase B grooming — vision, requirements, architecture, tech stack | user (PM) + assistant | Full Phase B sweep — 1 of 5 stories closed (STORY-008); now in STORY-010 |
| STORY-010 | Tech-stack decision — backend / frontend / polyglot | user (PM) + assistant | Q1 active: backend stack (TS / Go / polyglot). ADR-0002 will reference D-13, D-15, D-16, D-21 |

---

## Up next

| ID | Title | Estimate | Why next |
|---|---|---|---|
| STORY-011 | Cloud-target decision — AWS / GCP / both | M | Blocked by STORY-010 |
| STORY-009 | Architecture grooming — tenancy, event bus, observability + ~13 ADRs | L | Blocked by STORY-008 (done) + STORY-010; will likely split |
| STORY-012 | MVP-1 scope lockdown — pick from 14+ candidates | L | Blocked by STORY-008…STORY-011; closes Phase B |

---

## Backlog (Phase B grooming)

(none — all five Phase B stories are either in progress or queued in "Up next")

---

## Recently done

| ID | Title | Closed | Notes |
|---|---|---|---|
| STORY-008 | Vision grooming — persona, differentiator, kit promise | 2026-04-28 | 12 decisions locked (D-12..D-23), 7 NOVEL_IDEAS entries, 4 RECOMMENDED_ADDITIONS, CLAUDE.md vision updated to AI-first |
| EPIC-001 | Phase A bootstrap — repo, skills, tracking, GitHub | 2026-04-25 | Repo at https://github.com/khoks/StarterSaaS; PR #1 auto-merged |
| STORY-007 | End-to-end auto-PR validation cycle | 2026-04-25 | PR #1 squash-merged (commit `5f2ab0a`) |
| STORY-006 | GitHub remote — `gh repo create khoks/StarterSaaS --private` | 2026-04-25 | Private repo created; bootstrap pushed |
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
| [EPIC-001](./epics/EPIC-001-bootstrap.md) | done | scaffolding | STORY-001 → STORY-007 (all done) |
| [EPIC-002](./epics/EPIC-002-grooming.md) | in-progress | scaffolding | STORY-008 done; STORY-010 in progress; STORY-009/011/012 queued |

(EPIC-003+ for MVP-1 subsystems are created during STORY-012 Phase C lockdown.)

---

## Conventions

See [`README.md`](./README.md) for full conventions. Quick reference:

- **Status flow**: `backlog → todo → in-progress → review → done` (with `blocked` / `canceled` from any state)
- **Priorities**: P0 (critical) / P1 (important) / P2 (nice) / P3 (low)
- **Phases**: `scaffolding` / `mvp` / `v1` / `v2` / `v3`
- **Find in-progress items**: `grep -l "status: in-progress" project/{epics,stories,tasks}/*.md`

---

## Phase A retrospective notes

- Bootstrap commit landed directly on `main` (per D-10): `82ff650` (40 files, 2325 insertions)
- First auto-PR (#1, commit `5f2ab0a`) closed STORY-001…STORY-006 + progressed STORY-007 to `in-progress`
- Phase A retrospective: scope held — no source code touched, no tech-stack speculation, no scope creep
- Branch protection on `main` is **not yet configured** (auto-merge succeeded immediately because no required checks are gating). Recommended Phase B kickoff action: enable branch protection in the GitHub UI to require the `markdown-lint` workflow before merge
- Plan filename `i-want-to-build-happy-cocke.md` (speech-to-text artifact) can be safely deleted from `~/.claude/plans/`
