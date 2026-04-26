---
id: STORY-010
title: Tech-stack decision — backend / frontend / polyglot scope
type: story
status: backlog
priority: P0
estimate: M
parent: EPIC-002
phase: scaffolding
tags: [grooming, tech-stack, phase-b]
created: 2026-04-25
updated: 2026-04-25
---

## Description

As an engineer, I need the tech stack locked for MVP-1: backend language + framework, frontend framework, ORM, runtime model (single-process / microservice mesh), and whether polyglot is allowed. Output: ADR-0002 with the locked stack + rationale.

## Acceptance criteria

- [ ] Backend stack decided (TypeScript+Fastify / Go / polyglot)
- [ ] Frontend stack decided (Next.js / framework-agnostic component lib)
- [ ] ORM / DB-access approach decided
- [ ] Runtime model decided (modular monolith / microservices)
- [ ] Polyglot rules documented (which languages allowed when)
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
