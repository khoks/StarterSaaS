---
id: STORY-002
title: CLAUDE.md + vision capture (RAW_VISION + placeholders)
type: story
status: in-progress
priority: P0
estimate: M
parent: EPIC-001
phase: scaffolding
tags: [claude-md, vision, scaffolding]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As a Claude Code agent picking up future sessions, I need a single `CLAUDE.md` entry point that captures the mission, locked decisions, links to all key docs, and the auto-housekeeping pattern; plus the verbatim user vision in `docs/vision/RAW_VISION.md` so future sessions can re-read original intent without paraphrase loss.

## Acceptance criteria

- [x] `CLAUDE.md` written with mission, decisions table (D-1…D-11), where-to-find-things, auto-housekeeping, tracking-as-source-of-truth, coding standards (stubbed pending Phase B), commit style, OS notes, ADR rule, MVP gate, never-do list, collaboration cadence guardrail
- [ ] `docs/vision/RAW_VISION.md` written with verbatim user message + transcription-artifacts footnote
- [ ] `docs/vision/GROOMED_FEATURES.md` placeholder (filled Phase B)
- [ ] `docs/vision/RECOMMENDED_ADDITIONS.md` placeholder
- [ ] `docs/vision/NOVEL_IDEAS.md` placeholder
- [ ] `docs/architecture/ARCHITECTURE.md` stub ("pending Phase B")
- [ ] `docs/roadmap/MVP.md` stub
- [ ] `docs/roadmap/ROADMAP.md` stub showing phases A → D

## Tasks under this Story

(None — file authorship done inline.)

## Dependencies

- Blocks: STORY-007 (validation cycle reads CLAUDE.md to confirm it loads)
- Blocked by: STORY-001 (folder skeleton)

## Notes

Per D-11, `RAW_VISION.md` body is verbatim. Transcription artifacts are flagged in a separate `## Transcription artifacts` footnote, not edited inline.

## Activity log

- 2026-04-25 — created; status → in-progress (CLAUDE.md done, vision docs in progress)
