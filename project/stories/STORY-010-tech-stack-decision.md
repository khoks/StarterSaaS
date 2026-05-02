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

- [x] Backend stack decided (TypeScript+Fastify / Go / polyglot) — *locked 2026-05-02 as D-24: TypeScript + Node.js + Fastify*
- [ ] Frontend stack decided (Next.js / framework-agnostic component lib)
- [ ] ORM / DB-access approach decided
- [x] Runtime model decided (modular monolith / microservices / hybrid) — *locked 2026-05-02 as D-24: modular monolith for MVP-1; hybrid via service-extraction allowed v1+ per D-26*
- [x] Polyglot rules documented (which languages allowed when) — *locked 2026-05-02 as D-26: 10× perf + clear contract + bilingual maintainer commitment; MVP-1 pure TS*
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
- 2026-05-02 — **Q1 locked**: backend = **TypeScript + Node.js + Fastify** on a modular-monolith runtime for MVP-1. Node for prod AND dev (Bun explicitly excluded, re-evaluate v1+). Logged as D-24. Coding standard locked as D-25: **TS strict + Zod on every public boundary** (HTTP routes / plugin extension points / event-bus messages / adapter interfaces / config schema / AI agent I/O). Polyglot escape-hatch rule locked as D-26: 10× perf + clear contract boundary + bilingual maintainer commitment, all three required; MVP-1 stays pure TS. ACs ticked: Backend stack ✓, Runtime model ✓, Polyglot rules ✓ (3 of 9). Next: Q2 — frontend stack (Next.js / Remix / Astro / framework-agnostic)
