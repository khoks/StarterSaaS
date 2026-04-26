---
name: harvest-knowledge
description: Extract vision, feature ideas, architectural / scaling / infrastructure / tech-stack decisions, novel or patentable ideas, and crucial product or engineering decisions from the current conversation, then persist them into the right project docs (RECOMMENDED_ADDITIONS, ARCHITECTURE / ADRs, DECISIONS_LOG, NOVEL_IDEAS). Run this near the end of any session that touched product, architecture, or decisions — the Stop hook will remind you. Skip-and-say-so if the conversation introduced nothing new worth persisting.
---

# harvest-knowledge

This skill is the project's institutional memory. It runs at the end of (almost) every session and writes down anything new the conversation produced so a future session — Claude or human — can pick up without losing context.

The Stop hook (`.claude/hooks/post-session-housekeeping.sh`) auto-invokes it as the **first** of three skills (this → `work-tracking` → `auto-pr`). You can also call it manually mid-session if a long discussion just ended.

## When to skip

If the conversation was purely tactical — fixing a bug, running tests, reading code, no new ideas or decisions — say so explicitly in your handoff:

> harvest-knowledge: nothing new to persist this session. Conversation was [one-line summary].

Then move on to `work-tracking`. **Do not invent things to write down.**

## What to look for

Scan the user's messages and your own responses for these five categories. A single sentence can belong to multiple categories — that's fine; persist it in each relevant place.

| Category | Examples (SaaS-platform-flavored) | Destination |
|---|---|---|
| **Feature idea / vision item** | "the kit should also expose…", "founders will probably want…", "v2 maybe a marketplace for plugins…" | `docs/vision/RECOMMENDED_ADDITIONS.md` (append to relevant section, mark `Filed?` column) |
| **Architecture / perf / scaling / infra / tech-stack** | tech-stack lockdown, cloud target, multi-tenancy isolation, event bus, observability default, security model, deploy script shape | `docs/architecture/ARCHITECTURE.md` if minor, or a **new ADR** `docs/architecture/ADR-NNNN-<slug>.md` if it changes a locked decision or adds a new one |
| **Product / engineering decision** | "we'll use X over Y because…", "we're going to defer Z", "MVP-1 scope now includes…", commit-style judgment calls | `docs/decisions/DECISIONS_LOG.md` (append a dated entry) |
| **Novel / patentable idea** | a mechanism the user thinks is genuinely new (e.g., a new saga-DSL, a SaaS-aware contextual bandit for upsell, a novel data-quality contract layer that doesn't exist in OSS yet) | `docs/vision/NOVEL_IDEAS.md` (append a dated entry with rationale and prior-art note) |
| **Recommended-additions backlog drift** | the conversation suggests an item already in `RECOMMENDED_ADDITIONS.md` but with new detail or rationale | Update that item in place (don't duplicate) |

## File-update patterns

### `docs/vision/RECOMMENDED_ADDITIONS.md`
Catalog of ideas organized by SaaS layer (auth, RBAC, gateway, billing, etc.) or theme (white-label mechanism, deploy story, dev-portal, etc.). Each idea is a row or bullet with: **Description • Rationale • Phase (mvp/v1/v2/v3) • Filed?**. When you add an idea:
1. Find the relevant section (or create one).
2. Append a new row/bullet.
3. If the idea is concrete enough that someone could start in v1/v2 (a) reinforces a differentiator and (b) is specific enough to estimate, also flag it for the **work-tracking** skill to file as a Story.

### `docs/architecture/ADR-NNNN-<slug>.md`
Use the existing ADR pattern (status / context / decision / consequences). Find the next free `NNNN` by listing `docs/architecture/`. Keep ADRs short — 1–2 paragraphs each section. Update `docs/architecture/ARCHITECTURE.md` if the decision changes a locked choice.

### `docs/decisions/DECISIONS_LOG.md`
Running chronological log. Each entry:

```markdown
## 2026-MM-DD — <one-line decision>

**Context:** what prompted this
**Decision:** what we picked
**Alternatives considered:** what we didn't pick and why
**Owner:** who decided (usually the user)
**Related:** ADR-XXXX, STORY-YYY, file:line, etc.
```

Use this for *product* and *cross-cutting engineering* decisions that don't warrant a full ADR but matter for future-you to remember the *why*.

### `docs/vision/NOVEL_IDEAS.md`
Reserved for things the user explicitly flags as novel, or that you genuinely have not seen documented elsewhere in the public SaaS-platform space. Each entry:

```markdown
## 2026-MM-DD — <name of the idea>

**What it is:** 2–3 sentences
**Why it might be novel:** what existing approaches do differently; cite competitors / prior art if you know any (Supabase, Pocketbase, Appwrite, Amplify, Firebase, Strapi, Saleor, Medusa, etc.)
**Patentability signal:** plain-language note on whether this looks like a method/process/system claim worth a deeper patent search; never legal advice
**Where it lives in the product:** epic/story link
**Open questions:** what would need to be true for this to actually work
```

Be honest about novelty. If a five-second mental search turns up an obvious prior-art match, write that down — false patent flags waste real money.

## Process (what to do, in order)

1. **Read** `docs/vision/RECOMMENDED_ADDITIONS.md`, `docs/decisions/DECISIONS_LOG.md`, `docs/vision/NOVEL_IDEAS.md` if you don't already know their current state. Glance at `docs/architecture/` to see the ADR numbering.
2. **Scan the conversation** for the five categories above. Aggregate into a mental list.
3. **Dedupe against existing docs** — for each candidate, check whether it (or a near-equivalent) is already written down. If yes, update in place rather than appending a duplicate.
4. **Write the updates** in a small number of `Edit`/`Write` calls (don't make 30 micro-edits to one file — batch).
5. **Cross-link** new entries: ADR ↔ DECISIONS_LOG ↔ STORY ↔ NOVEL_IDEAS where relevant.
6. **Report** in 2–4 lines what you persisted and where. List affected files. Then hand off to `work-tracking` (which runs next in the Stop hook chain).

## What NOT to do

- Do **not** re-summarize the whole session into a new doc. The skill is for atomic, durable knowledge — not session journals.
- Do **not** create new doc directories outside the four destinations above without asking.
- Do **not** copy code snippets into docs — link to file:line instead.
- Do **not** invent decisions the user did not make. If you're guessing, say "PROPOSED:" in the entry and ask the user to confirm next session.
- Do **not** commit. The `auto-pr` skill (third in the chain) handles staging, branching, committing, pushing, opening the PR, and enabling auto-merge.

## Boundary with work-tracking and auto-pr

`harvest-knowledge` writes **prose docs**. `work-tracking` writes **Epic/Story/Task files + BOARD.md**. `auto-pr` writes **git history + a PR**.

Order: `harvest-knowledge` first → `work-tracking` second → `auto-pr` last. The order matters because:
- `work-tracking` may consume `harvest-knowledge`'s output (e.g., a newly-flagged idea in `RECOMMENDED_ADDITIONS.md` that should also be filed as a Story).
- `auto-pr` commits whatever the prior two skills produced, plus any other dirty doc/tracking changes from the session.
