---
id: STORY-010
title: Tech-stack decision — backend / frontend / polyglot scope
type: story
status: in-progress
priority: P0
estimate: M
parent: EPIC-002
phase: scaffolding
tags: [grooming, tech-stack, phase-b]
created: 2026-04-25
updated: 2026-04-28
---

## Description

As an engineer, I need the tech stack locked for MVP-1: backend language + framework, frontend framework, ORM, runtime model (single-process / microservice mesh), and whether polyglot is allowed. Output: ADR-0002 with the locked stack + rationale.

## Acceptance criteria

- [ ] Backend stack decided (TypeScript+Fastify / Go / polyglot)
- [ ] Frontend stack decided (Next.js / framework-agnostic component lib)
- [ ] ORM / DB-access approach decided
- [ ] Runtime model decided (modular monolith / microservices / hybrid)
- [ ] Polyglot rules documented (which languages allowed when)
- [ ] Package manager + monorepo tooling chosen (consistent with D-21 monorepo + workspaces direction)
- [ ] Default LLM provider mix chosen for the LLM Gateway (consistent with D-15 AI Sub 4)
- [ ] Vector DB chosen (consistent with D-15 AI Sub 1, AI Sub 2)
- [ ] ADR-0002 written, status: accepted

## Tasks under this Story

(Tasks created on demand during grooming.)

## Dependencies

- Blocks: STORY-009 (architecture decisions reference the stack), STORY-012
- Blocked by: STORY-008 (vision constrains stack — e.g., enterprise-target favors operational simplicity → TS-only)

## Notes

The plan's recommendation is TS+Fastify+Next.js for MVP-1 (operational simplicity, mirrors LearnPro), with polyglot allowed in v2+. User has not yet approved this — discuss in Phase B.

## Activity log

- 2026-04-25 — created (Phase B placeholder)
- 2026-04-28 — picked up; STORY-008 closed (D-12 through D-23 locked); ADR-0002 will reference all of D-13 (persona), D-15 (AI-first), D-16 (subscribe-to-upstream + thin-shell + packages), D-21 (monorepo + workspaces). Acceptance criteria expanded to include package-manager + monorepo-tooling + AI provider mix + vector DB picks (carried over from STORY-008 open/pending). First question: backend stack (TypeScript / Go / polyglot)
