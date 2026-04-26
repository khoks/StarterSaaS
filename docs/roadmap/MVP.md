# MVP-1 scope

> **Status: stub.** Filled in during Phase C lockdown (STORY-012). Do not start Phase D implementation until this document is complete.

---

## MVP-1 promise (one paragraph, TBD)

What does a founder get when they clone StarterSaaS, run the deploy script, and log in for the first time? Locked in STORY-012.

Plan recommendation (not yet locked): a thin vertical slice that demonstrates every layer is reachable end-to-end — auth → tenant context → API call → event published → notification fires → metric scraped → dashboard updates. Six subsystems: auth + RBAC + multi-tenant DB + API gateway + notifications (email + in-app) + observability (logs + metrics + traces).

---

## In MVP-1 (TBD)

For each chosen subsystem:

| # | Subsystem | Epic | Exit criteria | Dependencies |
|---|---|---|---|---|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## Out of MVP-1 (explicitly)

Documented to prevent feature creep. Filled in during STORY-012.

| Subsystem | Why deferred | Target phase |
|---|---|---|
| Billing / subscriptions | Stripe SDK + thin wrapper is MVP-2 | v1 |
| Marketing site | Sibling repo (`StarterSaaS-marketing`); not blocking app launch | v1 |
| ML platform / data lake / ETL | Massive scope; v2/v3 | v2/v3 |
| Conversational care chatbot | Requires a stable knowledge base first | v2 |
| Saga choreography DSL | Default to plain pub/sub for MVP-1 | v2 |
| Mobile native apps | Web-first; mobile via Capacitor or React Native in v1+ | v1 |
| Developer portal / API marketplace | Not needed until external API consumers exist | v2 |
| Multi-cloud (if MVP-1 is single-cloud) | One cloud first; abstract in v2 | v2 |

---

## Exit criteria (MVP-1 ships when)

- [ ] All chosen subsystem Epics are `status: done`
- [ ] One-script deploy works end-to-end on the chosen cloud (`scripts/deploy.sh`)
- [ ] A founder can clone, white-label (edit `brand.config.ts`), deploy, and log in within ~30 minutes
- [ ] All ADRs (ADR-0002+) are `status: accepted`
- [ ] CI is green (lint + unit + integration + smoke E2E)
- [ ] Documentation is accurate (README, ARCHITECTURE, deploy guide)
- [ ] At least one external founder has cloned, deployed, and confirmed it works (validates the white-label path)

---

## How this doc evolves

- Phase B grooming (STORY-008…STORY-011) fills in *what's possible*.
- Phase C (STORY-012) locks *what's MVP-1*.
- Phase D execution updates exit criteria and per-Epic status.
- After MVP-1 ships, this file is renamed `MVP-1-SHIPPED.md` and a new `MVP-2.md` (or `v1.md`) takes over.
