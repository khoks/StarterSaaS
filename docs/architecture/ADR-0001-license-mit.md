# ADR-0001 — License: MIT

- **Status:** accepted
- **Date:** 2026-04-25
- **Deciders:** Rahul Singh Khokhar (project owner)
- **Supersedes:** (none)
- **Superseded by:** (none)

---

## Context

StarterSaaS is a generic, white-label SaaS starter kit. The product hypothesis is that founders adopt it because they can clone, fork, white-label, and ship — without licensing friction. The license choice determines:

1. Whether founders can use it commercially without paying or asking
2. Whether competing kit vendors can re-host StarterSaaS as a hosted SaaS offering
3. Whether contributions flow easily back to the project
4. Whether enterprise legal teams approve adoption

The maintainer's sister project (LearnPro) chose **BSL 1.1 → Apache 2.0 (2030-04-25)** because LearnPro's threat model includes hosted-SaaS competitors and the value is in the trained-tutor pedagogy loop. StarterSaaS's threat model is different — the value compounds with adoption, the per-customer configuration is non-trivial enough that "just re-host it" is a weak business model, and friction in legal review is a real adoption killer.

## Decision

**Adopt MIT** as the StarterSaaS license, with copyright `Copyright (c) 2026 Rahul Singh Khokhar`.

## Considered alternatives

- **Apache 2.0** — Same permissiveness as MIT but adds an explicit patent grant. Slightly heavier text. Considered for this reason but MIT's brevity and ubiquity won.
- **BSL 1.1 (LearnPro's choice)** — Forbids competitor hosting until a Change Date, then converts to Apache 2.0. Considered, but the friction-vs-protection trade-off doesn't pay off for a kit whose *adoption* is the primary success metric.
- **AGPL 3.0** — Strong copyleft. Would force every founder using the kit to publish their modifications. Considered briefly but rejected: it would tank adoption, and the project's value isn't compounded by forced openness.
- **GPL 3.0** — Same copyleft trap, slightly less viral than AGPL on network use. Same rejection logic.
- **Proprietary / source-available custom** — Rejected: the project's whole pitch is "you can really truly use this." Custom licenses scare enterprise legal teams.
- **Dual license (MIT + commercial)** — Considered for a future revenue path. Deferred: not an MVP-1 concern; can be layered on later if there's a paid-support tier without changing the OSS license.

## Consequences

### Positive

- **Maximum adoption.** MIT is on every legal team's pre-approved list. Founders can fork and white-label without escalation.
- **Universal compatibility.** Every other OSS license in the SaaS ecosystem (Postgres, Redis, Node, Python, Go, etc.) is compatible with MIT.
- **Brevity.** The full license text is one short paragraph; users don't need a lawyer to understand it.
- **Aligns with self-host-first ethos.** "You own what you download" is a clean message.

### Negative

- **No patent grant.** If the project ever becomes a target for patent assertion, MIT's silence on patents is a weakness vs. Apache 2.0. Mitigation: revisit if/when patentable subsystems land (`docs/vision/NOVEL_IDEAS.md` will surface candidates).
- **No protection against hosted competitors.** A well-funded vendor could fork StarterSaaS and resell it as a hosted SaaS. Mitigation: this is acceptable because the per-customer integration depth is StarterSaaS's moat, not the licensing.
- **No copyleft.** Founders can take the kit, modify it, ship a closed-source product, and never contribute back. Mitigation: this is by design — adoption > forced contribution. Best-effort upstream contribution is encouraged via CONTRIBUTING.md (added in v1).

### Neutral

- License diverges from LearnPro (BSL 1.1) by design — the two projects have different value-capture models.

## Implementation notes

- The full MIT license text lives at [`../../LICENSE`](../../LICENSE).
- Every source file does NOT need a per-file license header (MIT doesn't require it). If we want one for clarity later, we can add it via a one-time pass.
- `package.json` / `pyproject.toml` / `go.mod` (added in Phase D) should declare `"license": "MIT"`.

## Revisit triggers

- A patentable subsystem ships (file `NOVEL_IDEAS.md` entry → consider Apache 2.0)
- A hosted-SaaS competitor emerges that copies StarterSaaS verbatim (consider BSL or dual-license)
- Enterprise customers request a commercial license for indemnification (consider dual-license without changing the OSS license)
