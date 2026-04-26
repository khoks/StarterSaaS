---
id: STORY-005
title: License (MIT), README, gitignore, gitattributes, .github files
type: story
status: done
priority: P0
estimate: S
parent: EPIC-001
phase: scaffolding
tags: [license, readme, github-meta, scaffolding]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As a founder considering forking StarterSaaS, I need the repo to land with a clear MIT license, an informative root `README.md`, sensible `.gitignore` / `.gitattributes`, a PR template, and a placeholder CI workflow — so the very first browse of the GitHub repo conveys the project's mission, license, and contribution shape.

## Acceptance criteria

- [x] `LICENSE` is the full MIT text with `Copyright (c) 2026 Rahul Singh Khokhar`
- [x] `README.md` has a 1-paragraph mission, the 4-phase delivery table, and links to CLAUDE.md / BOARD / RAW_VISION
- [x] `.gitignore` covers OS, IDE, env/secrets, Node/pnpm/Turbo, Python, Go, Terraform/Pulumi, Docker, Claude Code state — stack-agnostic since Phase B picks the stack
- [x] `.gitattributes` enforces LF for source files and CRLF for `.bat`/`.cmd`/`.ps1`; declares binary types
- [x] `.github/PULL_REQUEST_TEMPLATE.md` exists with sections: Story / Epic, Summary, Test notes, Checklist
- [x] `.github/workflows/ci.yml` exists as a markdown-lint placeholder (no code yet, so no test/build steps)

## Tasks under this Story

(None — small files written inline.)

## Dependencies

- Blocks: STORY-006 (`gh repo create` reads README + LICENSE for the GitHub repo metadata)
- Blocked by: STORY-001

## Notes

License choice (MIT) is locked in [`docs/architecture/ADR-0001-license-mit.md`](../../docs/architecture/ADR-0001-license-mit.md). It diverges from LearnPro's BSL 1.1 by design — see ADR-0001 for the rationale (white-label adoption requires maximum permissiveness; the kit's value isn't gated by license but by integration depth).

## Activity log

- 2026-04-25 — created; status → in-progress (license + README + gitignore + gitattributes done; .github files pending)
- 2026-04-25 — .github files written; status → done
