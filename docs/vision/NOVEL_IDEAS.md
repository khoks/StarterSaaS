# Novel / patentable ideas

> Ideas that are *plausibly novel* — not standard practice, not a well-known pattern. Maintained by the `harvest-knowledge` skill. Each entry is the user's idea, plus the assistant's analysis of advantages, disadvantages, and novelty.
>
> **Filing here does NOT mean the idea is patentable.** It means it's worth preserving for future review by the user, an attorney, or a v2/v3 design session. Treat this file as an inventor's notebook, not a patent application.

---

## Format

For each idea, capture:

- **Title** — one line, descriptive
- **Domain** — which SaaS subsystem (upsell ML / care chatbot / saga choreography / data quality / nudge engine / other)
- **Date raised** — `YYYY-MM-DD`
- **Source** — session ID or transcript reference, so future sessions can re-read context
- **Idea (user's words)** — verbatim or close-paraphrase, so the user's framing is preserved
- **Best-known production approach** — what most teams do today (so the novelty is measurable)
- **Advantages of user's approach**
- **Disadvantages of user's approach**
- **Novelty assessment** — `low` / `medium` / `high` and a one-paragraph rationale
- **Recommended next step** — `discuss further` / `prototype in v2` / `file provisional patent` / `merge into best-known approach` / `drop`

---

## Ideas

(empty — populated during Phase B grooming when the user surfaces algorithmic/architectural innovations)

<!--
Example template (uncomment when adding entries):

### Idea — Contextual-bandit upsell with user-pace signal

- **Domain:** upsell ML
- **Date raised:** YYYY-MM-DD
- **Source:** session abc123
- **Idea (user's words):** "Use the user's pace metric (time-to-task-completion) as a context vector dimension in a contextual bandit; when pace slows, the model should bias toward simpler upsell offers; when pace accelerates, bias toward power-user upgrades."
- **Best-known production approach:** Most SaaS teams use rule-based upsell triggers (e.g., usage > X → upgrade prompt), or static A/B tests, or generic LinUCB on user metadata.
- **Advantages of user's approach:** Pace-aware bias gives temporally-aligned upsell — catches users in the right cognitive state, not just the right account-state. Could meaningfully reduce upsell fatigue.
- **Disadvantages of user's approach:** Pace metric needs reliable instrumentation; reward sparsity is brutal (most users never upgrade); the bias direction is intuitive but unproven.
- **Novelty assessment:** medium. Contextual bandits in upsell are documented in the literature; using a *behavioral pace signal* as the context vector is less common but has analogues in churn prediction. Worth a literature scan before claiming novelty.
- **Recommended next step:** prototype in v2; record results before considering a provisional patent.
-->
