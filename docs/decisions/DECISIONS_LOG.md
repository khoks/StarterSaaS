# Decisions log

> Lighter-weight than ADRs. ADRs are full architectural decisions with context / alternatives / consequences. The decisions log is a chronological list of *every* meaningful decision — product, process, architectural, tooling — captured by the `harvest-knowledge` skill. ADR-grade decisions get cross-linked here AND get a full ADR file.
>
> Format: `D-NNN — date — area — title — one-line rationale — link (if any)`.

---

## Phase A bootstrap (this session)

| ID | Date | Area | Decision | Rationale | Link |
|---|---|---|---|---|---|
| D-1 | 2026-04-25 | repo-location | Project lives at `D:\DEV\ClaudeProjects\StarterSaaS` | Sibling to LearnPro; independent project; no shared monorepo | — |
| D-2 | 2026-04-25 | naming | Project name is `StarterSaaS` | User-confirmed; "happy-cocke" was a speech-to-text artifact and discarded | — |
| D-3 | 2026-04-25 | license | License is MIT | Maximum permissiveness for white-label adoption; adoption > protection | [ADR-0001](../architecture/ADR-0001-license-mit.md) |
| D-4 | 2026-04-25 | git | Default branch is `main` | GitHub default; will be PR-protected after Phase A | — |
| D-5 | 2026-04-25 | github | Remote is private repo `khoks/StarterSaaS` via `gh repo create` | Visibility flips to public when MVP-1 ships | — |
| D-6 | 2026-04-25 | tooling | Skill set: copy + adapt LearnPro's `harvest-knowledge` + `work-tracking`; add NEW `auto-pr` skill | Three-skill chain in Stop hook; preserves the proven prose+tracking flow and adds git automation | — |
| D-7 | 2026-04-25 | workflow | Auto-PR model: branch-per-session → push → `gh pr create` → `gh pr merge --auto --squash` | Keeps `main` always-green; PR queue is the audit trail | — |
| D-8 | 2026-04-25 | collaboration | Heavy upfront PM + engineer discussion on design / requirements / algorithms / tech stack BEFORE work; auto-merge after agreement | User explicitly requested. Auto-PR is a tool for landing already-agreed work, NOT a substitute for the discussion | — |
| D-9 | 2026-04-25 | scope | MVP-1 is a thin vertical slice end-to-end (~6 subsystems). Exact 6 chosen during Phase B/C grooming | Demonstrates every layer is reachable end-to-end, not that each subsystem exists in isolation | — |
| D-10 | 2026-04-25 | git | Bootstrap commit lands directly on `main` (no PR). After that, `auto-pr` takes over | Bootstrap *is* the PR-able infrastructure; can't PR before it exists | — |
| D-11 | 2026-04-25 | docs | Verbatim user vision goes into `docs/vision/RAW_VISION.md`. Transcription artifacts noted in a footnote, NOT edited inline | Body is source-of-truth for intent; editing inline would lose the user's framing | — |

---

## Phase B grooming

| ID | Date | Area | Decision | Rationale | Link |
|---|---|---|---|---|---|
| D-12 | 2026-04-27 | workflow | Phase B grooming runs as a single multi-session sweep through STORY-008 → STORY-012, with full PM treatment per open question (industry/competitive context + recommendation + tradeoffs + explicit invitation for user innovation + novelty analysis if user proposes one) | User explicitly chose this scope and cadence over piecemeal grooming or compact Q&A; instantiates D-8 for Phase B specifically; ensures the algorithmic-innovation probe `RAW_VISION.md` called for | — |
| D-13 | 2026-04-27 | persona | Primary persona is the **founder's first engineer** at a 1-5 person company. Secondary: solo founder (v1 "lite profile" — fewer layers enabled). Tertiary: small-team CTO inheriting a codebase where the first engineer already adopted the kit (lifecycle continuity) | This persona has authority + urgency + technical chops + felt-pain at once — the rare combination that produces deliberate, high-conversion adoption rather than churn. Whitespace in OSS-kit positioning: Supabase / Pocketbase / Appwrite / Firebase target founders generically, AWS / GCP target platform teams, nobody targets first engineers. Lifecycle continuity means today's first engineer is tomorrow's small-team CTO, so adoption happens earlier and grows with the company. Implies first-class migration-path support (engineer inherits existing code, not greenfield) — filed as a recommended addition | [GROOMED_FEATURES § Persona](../vision/GROOMED_FEATURES.md#persona) |
| D-14 | 2026-04-27 | workflow | Assistant is authorized to use `gh pr merge --admin --squash` to land **doc-only and tracking-only PRs** (housekeeping / grooming / decisions / ADRs) without waiting for a manual review approval. Branch protection on `main` stays strict (1 review required, markdown-lint required, linear history, no force-push). Source-code PRs (once Phase D begins) DO NOT get this override and must follow the normal review flow | User's solo-dev workflow: strict policy is right for code, but housekeeping PRs that only touch `docs/`, `project/`, `.claude/` would otherwise pile up indefinitely. Repo-level `allow_auto_merge` stays `false` — this is a deliberate per-PR escape hatch, not a blanket auto-merge. Scope discipline: the moment any PR touches `apps/`, `packages/`, `services/`, `infra/`, or `scripts/`, the override does not apply | — |
| D-15 | 2026-04-28 | differentiator + vision | StarterSaaS's headline differentiator (and core vision): **"AI-first, production-grade SaaS platform — 30+ integrated layers you will eventually need, white-labelable, one-command deployable."** Combines breadth (A) + production-grade (B) + one-command deploy (C) framings with a new dimension — **AI-first** — added by the user. Five named AI subsystems anchor the AI-first claim: (1) Event-driven Customer Profile Builder + AI-Native Stores, (2) Context-Resolving Query Service, (3) Agent Platform + Omnichannel Orchestrator with 6 registries, (4) LLM Gateway + Safety + Model Hub + Eval/Cost (foundational; MVP-1), (5) AI Coworker Platform for Internal Ops. CLAUDE.md mission updated; AI subsystems filed in NOVEL_IDEAS + RECOMMENDED_ADDITIONS | Whitespace in OSS positioning — no major OSS kit (Supabase / Pocketbase / Appwrite / Firebase / Strapi) is positioned AI-first. 2026 timing: every founder asks "how do I add AI?" and we answer before they ask. Persona fit: the founder's first engineer (D-13) is increasingly tasked with making the product AI-powered. Implies AI/ML platform moves from v2 (deferred) to MVP-1 candidate (foundational AI Subsystem 4 + subset of 3), expanding STORY-012 scope. Implies subscribe-to-upstream becomes more critical (Q3) because AI models/patterns evolve weekly | [GROOMED_FEATURES § Differentiator](../vision/GROOMED_FEATURES.md#differentiator) |
| D-16 | 2026-04-28 | kit-promise | Kit-promise model: **hybrid** — subscribe-to-upstream for the 30+ platform layers + 5 AI subsystems + adapter interfaces + deploy script; fork-once for white-label brand layer + product-specific business logic + custom UI screens. Mechanism: **packages + thin shell** — kit code ships as versioned packages, user repo is a thin shell importing them; adapter interfaces are package-exported contracts; user provides custom adapter implementations in shell. Concrete package manager TBD in STORY-010 (tech stack) | Persona D-13 (founder's first engineer) doesn't want to maintain platform code; subscribe-to-upstream matches their pain. AI-first D-15 means the 5 AI subsystems MUST be subscribable since models / prompts / safety techniques evolve weekly; pure fork-once would leave forks 4-5 model generations stale within 6 months. Pure subscribe-to-upstream removes the customization escape hatch for unusual product needs — the thin shell IS the escape hatch (vendor a package and customize when needed, accepting maintenance burden until you un-vendor). Pattern is well-validated in production by Saleor / Medusa / Drupal | [GROOMED_FEATURES § Kit-promise](../vision/GROOMED_FEATURES.md#kit-promise-model) |
| D-17 | 2026-04-28 | feature-scope | **AI-assisted upstream merge** confirmed as a first-class kit feature anchoring the AI-first + subscribe-to-upstream story. Mechanism: an agent detects upstream package updates → examines user customizations via adapter usage signatures → proposes a merge plan minimizing friction → tests the proposed merge against the user's test suite → surfaces conflicts to a human only when AI confidence is low. Implementation lives at the intersection of AI Subsystem 5 (Internal Ops Agent) and the kit-promise mechanism. Phase fit: **MVP-1** for the basic version (detect + propose + test); v1 for the full version (confidence scoring + autonomous-mode toggle). Implies AI Subsystem 5 needs a "lite" boundary — full Subsystem 5 is v2, but the merge-helper subset ships earlier | Combines two competitive moats — AI-first credibility + subscribe-to-upstream practicality — into one feature: "your kit upgrades itself." Direct response to "first engineer doesn't want to maintain platform code" pain (D-13) — even staying current is automated. No OSS kit ships "AI agent that helps you upgrade" as a first-class feature; component mechanisms (Dependabot / Renovate, Devin-style agents, LLM merge POCs) exist but the kit-aware-with-adapter-signatures + confidence-scored-escalation + integrated-as-first-class composition is novel. STORY-009 will design the ADR | [NOVEL_IDEAS — AI-assisted upstream merge](../vision/NOVEL_IDEAS.md) |

---

## How to add a new decision

The `harvest-knowledge` skill appends here automatically when sessions surface decisions. Manual additions follow the same row format:

- New ID = next free `D-NNN`
- Date = `YYYY-MM-DD` (ISO format)
- Area = short tag (`repo-location`, `license`, `git`, `tooling`, `workflow`, `scope`, `docs`, `architecture`, `auth`, `tenancy`, etc.)
- Decision = imperative one-liner
- Rationale = the *why*, especially the constraint or tradeoff that made this the right choice
- Link = ADR file if architectural-grade, otherwise `—`

**Rule:** if a decision is architectural (changes how subsystems interact, how data flows, what stack is used, what security model is enforced), it gets BOTH a row here AND a full ADR file. Otherwise this row alone is sufficient.

---

## Open / pending decisions (Phase B grooming)

These are flagged so future sessions know they're still open. They convert to D-12+ when grooming locks them.

| Area | Pending decision | Story |
|---|---|---|
| white-label | Config-driven / code-gen / plugin-driven mechanism | STORY-008 / STORY-009 |
| stack-backend | TypeScript+Fastify / Go / polyglot | STORY-010 |
| stack-frontend | Next.js / framework-agnostic component library | STORY-010 |
| tenancy | Shared-DB / schema-per-tenant / DB-per-tenant | STORY-009 |
| event-bus | Postgres NOTIFY / Redis Streams / Kafka | STORY-009 |
| observability | OpenTelemetry + which backend default | STORY-009 |
| cloud-target | AWS / GCP / both | STORY-011 |
| iac-tool | Terraform / Pulumi / Crossplane / custom shell | STORY-011 |
| mvp-surface | Which ~6 subsystems are MVP-1 | STORY-012 |
| auth-provider | Self-hosted (Auth.js / Authelia / Ory) / third-party adapter (Auth0 / Clerk) | STORY-009 / STORY-010 |
| billing | Stripe-only / pluggable; MVP-1 or deferred | STORY-008 / STORY-012 |
| marketing-site | Same repo / sibling repo (`StarterSaaS-marketing`) | STORY-008 |
| ml-platform | Pluggable / vendor-default / deferred to v2 | STORY-009 |
| data-quality | Per-table rules / lineage-aware / contract-based (Great Expectations / Soda) | STORY-009 |
