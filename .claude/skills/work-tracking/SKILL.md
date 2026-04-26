---
name: work-tracking
description: Maintain the in-repo JIRA-style work tracking system (Epics → Stories → Tasks under project/) and the live BOARD.md. Sweep the conversation for new requirements, scope changes, blockers, and status transitions; create new items where needed; update statuses with activity-log entries; refresh project/BOARD.md. Run near the end of any session that touched scope, requirements, or item status — the Stop hook will remind you. Skip-and-say-so if nothing changed.
---

# work-tracking

This skill keeps the project's Epic/Story/Task system synchronized with what actually happened (or got proposed) in the conversation. It runs **second** in the Stop hook chain, after `harvest-knowledge` and before `auto-pr`.

The conventions, ID format, frontmatter format, and lifecycle rules are documented in [`project/README.md`](../../../project/README.md). Templates live in [`project/TEMPLATES/`](../../../project/TEMPLATES/). Re-read those if you're unsure — this SKILL.md is the *operational checklist*, the README is the *source of truth* for conventions.

## When to skip

If the session was purely tactical and changed no scope or status, say so explicitly:

> work-tracking: no scope or status changes this session.

Then move on to `auto-pr`. **Do not invent work items.**

## What to look for

Scan the conversation for any of these signals. Each one corresponds to one or more concrete actions on `project/`.

| Signal | Action |
|---|---|
| User said "let's also add…" or "we should…" or `harvest-knowledge` flagged a backlog item | **Create a new STORY** under the relevant Epic with `status: backlog`. If it doesn't fit any existing epic, create a new EPIC first. |
| User picked up a Story or Task and started work | Set `status: in-progress`, append `YYYY-MM-DD — picked up` to activity log. |
| Work on an item completed | Check off ACs, set `status: done`, append `YYYY-MM-DD — done` (with a one-line summary), update BOARD. |
| User cancelled scope | Set `status: canceled`, add a one-line reason to activity log. |
| User reported a blocker | Set `status: blocked`, append the blocker reason to activity log. Add a row in BOARD's `## Blocked` section. |
| New Epic-level theme emerged | Create a new EPIC file (next free `EPIC-NNN`), seed with goal / scope / out-of-scope / exit criteria; add to BOARD's Epic index. |
| MVP scope changed | Update `docs/roadmap/MVP.md` AND adjust the affected Stories' `phase:` field. Flag this loudly in your handoff. |
| A grooming Q&A locked a decision | If a previously-`backlog` grooming Story (e.g., STORY-010 tech-stack-decision) is now decided, set its `status: done` and ensure the decision was logged by `harvest-knowledge` (cross-link). |

## Conventions (recap from `project/README.md`)

- **IDs** are flat with prefixes: `EPIC-NNN`, `STORY-NNN`, `TASK-NNN`. Find the next free number by listing the corresponding folder. Numbers are never reused.
- **Frontmatter is required** on every item: `id`, `title`, `type`, `status`, `priority`, `estimate` (for stories/tasks), `parent` (for stories/tasks), `phase`, `tags`, `created`, `updated`. Bump `updated:` on every change.
- **Status values:** `backlog` | `todo` | `in-progress` | `review` | `done` | `blocked` | `canceled`.
- **Estimates:** `XS` (<1h) | `S` (<4h) | `M` (<1d) | `L` (<3d) | `XL` (>3d).
- **Priority:** `P0` | `P1` | `P2` | `P3`.
- **Phase:** `scaffolding` | `mvp` | `v1` | `v2` | `v3`.
- **Activity log** is a markdown bullet list at the bottom of each item; append a new dated bullet for every status change with a one-line summary of what happened.
- **Commit style:** `<type>(<scope>): <subject> [STORY-NNN]` (or `[TASK-NNN]`). One commit per meaningful change so `git log -- project/` is a real audit trail. Always reference an ID. (The `auto-pr` skill handles the actual commit.)

## Process (what to do, in order)

1. **Read `project/BOARD.md`** to anchor on current state. Note the In Progress / Up Next / Backlog sections.
2. **Confirm `harvest-knowledge` ran first** — its output may have flagged new ideas worth filing as Stories.
3. **Scan the conversation** for the signals above. Aggregate into: { items to create, items to update, BOARD changes }.
4. **Discipline gate for new Stories:** only file an idea as a Story if (a) it reinforces a differentiator from the (eventually-written) `docs/product/DIFFERENTIATORS.md`, (b) someone could start work on it in the planned phase, and (c) it's specific enough to estimate today. Otherwise it stays in `RECOMMENDED_ADDITIONS.md` only.
5. **Create new items**: copy the matching template from `project/TEMPLATES/`, give it the next free ID, fill the frontmatter, write Description / Acceptance criteria (testable bullets) / Dependencies / Notes / Activity log.
6. **Update existing items**: edit frontmatter (`status`, `updated`), check off ACs that completed, append activity-log entries. Don't rewrite history — append.
7. **Update `project/BOARD.md`**: move rows between sections (In Progress / Up Next / Backlog / Recently Done / Blocked / Canceled), update the Epic index status column, bump the `Last updated:` line.
8. **Cross-link** new Stories to the `harvest-knowledge` entries that motivated them (RECOMMENDED_ADDITIONS row, NOVEL_IDEAS entry, ADR, DECISIONS_LOG entry).
9. **Report** in 2–5 lines what you created/updated and what's now `In Progress` / `Up Next`. Then hand off to `auto-pr`.

## Where new Epics live

The current epic taxonomy is sparse — only EPIC-001 (bootstrap) and EPIC-002 (grooming) seeded. Future epics emerge from grooming, *not* speculatively. Likely candidates the user has hinted at and which Phase B will firm up:

- `EPIC-003+` — One Epic per chosen MVP-1 SaaS layer (auth, RBAC, multi-tenant DB, gateway, notifications, observability, etc.) — created during Phase C scope lockdown, *not* before.
- A "deploy story" Epic covering the one-script multi-cloud deploy mechanism.
- A "white-label mechanism" Epic for the brand/config layer.

Don't create these speculatively — only when the user actually adds scope that warrants them.

## What NOT to do

- Do **not** mass-rewrite items. Edits should be surgical (frontmatter line + AC checkbox + appended log line).
- Do **not** re-number existing items. IDs are immutable.
- Do **not** mark a Story `done` if any Acceptance Criterion isn't checked off — either check it off (with justification in the log) or leave the Story `in-progress`.
- Do **not** create Tasks speculatively. Tasks are concrete implementation steps. Stories aren't decomposed into Tasks until they're picked up.
- Do **not** delete items. Use `status: canceled` with a one-line reason in the activity log.
- Do **not** commit. The `auto-pr` skill (next in the chain) handles staging, branching, committing, pushing, opening the PR, and enabling auto-merge.

## Boundary with harvest-knowledge and auto-pr

`harvest-knowledge` writes **prose docs**. `work-tracking` writes **structured items**. `auto-pr` writes **git history + PR**.

Run order in the Stop hook: `harvest-knowledge` → `work-tracking` → `auto-pr`. `work-tracking` may consume `harvest-knowledge`'s output; `auto-pr` consumes everything both wrote.
