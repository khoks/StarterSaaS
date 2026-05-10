---
id: STORY-032
title: Phase D monorepo workspace bootstrap (npm + Turborepo + TS strict)
type: story
status: done
priority: P0
estimate: M
parent: EPIC-003
phase: mvp
tags: [mvp, phase-d-bootstrap, monorepo, scaffolding]
created: 2026-05-07
updated: 2026-05-10
---

## Description

Foundational bootstrap for Phase D code work. Establishes the npm + Turborepo + TS strict monorepo skeleton per [D-21](../../docs/decisions/DECISIONS_LOG.md), [D-24](../../docs/decisions/DECISIONS_LOG.md), [D-25](../../docs/decisions/DECISIONS_LOG.md), [D-31](../../docs/decisions/DECISIONS_LOG.md). Prerequisite for STORY-013 (Auth.js integration) and every subsequent Phase D Story.

This is **not in the original Phase B Story plan** — it surfaced when Phase D code work was about to begin and the workspace structure needed to exist before STORY-013 could land. Created as a new Story under EPIC-003 (Identity + Tenancy) since EPIC-003 is the first Epic to consume the workspace.

## Acceptance criteria

- [x] Root `package.json` with `"workspaces": ["packages/*", "apps/*"]` declaration; `"engines": { "node": ">=20.0.0" }` — *PR #24*
- [x] `tsconfig.base.json` with `"strict": true` + `"noUncheckedIndexedAccess": true` + `"exactOptionalPropertyTypes": true` + ES2022 target + module bundler resolution — *PR #24*
- [x] `turbo.json` with `build` / `test` / `lint` / `typecheck` / `dev` pipeline definitions (per [D-31](../../docs/decisions/DECISIONS_LOG.md)) — *PR #24*
- [x] `packages/auth/` placeholder package: `package.json` declaring `@starter-saas/auth` + extending `tsconfig.base.json` + empty `src/index.ts` (real impl in STORY-013) — *PR #24*
- [x] `apps/starter/` placeholder app: `package.json` declaring `@starter-saas/starter` + extending `tsconfig.base.json` + empty `src/index.ts` (real impl progressive across EPIC-003..008) — *PR #24*
- [x] `README.md` updated with monorepo conventions section — *PR #24*
- [x] CLAUDE.md phase status updated to reflect Phase D start — *PR #24*
- [x] BOARD.md reflects EPIC-003 in-progress + STORY-032 in-progress — *PR #24*
- [x] CI typecheck job is **NOT** added in this PR (would require lockfile; lands with STORY-013 alongside real source) — *PR #24*

## Tasks under this Story

(All in this single PR — scope is bootstrap, no Phase D decomposition needed.)

## Dependencies

- Blocks: every Phase D Story (STORY-013 through STORY-031)
- Blocked by: nothing (Phase B closed)

## Notes

- ESLint + Prettier configs deferred to STORY-013 (per [D-25](../../docs/decisions/DECISIONS_LOG.md)) — they configure for real code
- No `npm install` run in this PR; lockfile generated when user (or CI) first runs install
- The `@starter-saas/auth` and `@starter-saas/starter` placeholders validate workspace + Turborepo wiring without committing to implementation choices
- This Story's PR was opened initially as the first **source-code-adjacent** PR with normal-review-required (per D-14, admin override was doc-only). **User authorized admin-merge for all PRs (D-57) before this PR was merged**, so this PR was admin-merged after self-review with the D-57 entry included in the diff

## Related

- ADRs: [ADR-0002](../../docs/architecture/ADR-0002-tech-stack.md) (the source-of-truth tech stack ADR this Story implements)
- Decisions: D-21, D-24, D-25, D-31

## Activity log

- 2026-05-07 — created as the Phase D bootstrap prerequisite for STORY-013; scoped tightly to monorepo skeleton + 2 placeholder packages
- 2026-05-07 — PR #24 opened (normal-review per D-14); user expanded admin-merge authorization to all PRs (D-57 logged in this PR); PR admin-merged after self-review
