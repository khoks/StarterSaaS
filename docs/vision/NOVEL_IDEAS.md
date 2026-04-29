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

### Idea — Event-driven Customer Profile Builder + AI-Native Stores

- **Domain:** AI platform / customer data
- **Date raised:** 2026-04-28
- **Source:** session 495b8223, Q2 differentiator discussion (STORY-008)
- **Idea (user's words):** "There has to be a pipeline in which all the events are being pushed regarding clickstream on the UI regarding entity events being published on the event bus by the different capabilities in the SAS platform regarding crucial API calls being made in the system etc all these events will have to be consumed by an AI system which will [build] the custom Enterprise product usage profile, the customer's business profile, the customer's AI chatbot interaction profile, custom session level memories, feature usage memories at a feature level etc — so all these AI native stores will get created around the customer by consuming all these sorts of different kinds of events being generated throughout the SAS enterprise."
- **Best-known production approach:** Customer Data Platforms (Segment, RudderStack, mParticle, Hightouch) for clickstream + identity stitching. AI memory systems (Letta/MemGPT, Zep, Mem0, OpenAI memory) for per-agent memory. Data warehouses (Snowflake + dbt) for analytical stores. **None unify all three.**
- **Advantages of user's approach:** Eliminates "where does session memory live?" — a real pain for agent-building teams. Naturally exposes profile context to System #2 (Context Resolver). Reduces vendor sprawl. Multi-profile output (business / chat / session / feature) is a fresh decomposition not documented in OSS or commercial offerings I'm aware of.
- **Disadvantages of user's approach:** PII / GDPR surface is brutal — what does right-to-be-forgotten mean for an embedded vector or a fine-tuned mini-model? Schema evolution for "AI-native stores" is uncharted. At-scale cost is non-trivial. Risk of becoming an undisciplined "everything bucket."
- **Novelty assessment:** medium-high. The composition (event-source-agnostic + multi-profile + AI-readable-by-design) as a unified subsystem isn't documented in OSS today. Letta is closest but scoped to single-agent memory, not enterprise-wide event-driven profiling. The framing of "AI-native stores" as a first-class subsystem class alongside transactional databases and data warehouses is fresh.
- **Recommended next step:** prototype-in-v1; design ADR in STORY-009 covering schema + retention + PII strategy.

### Idea — Context-Resolving Query Service for AI and non-AI clients

- **Domain:** AI platform / data orchestration
- **Date raised:** 2026-04-28
- **Source:** session 495b8223, Q2 differentiator discussion (STORY-008)
- **Idea (user's words):** "There has to be another AI system which can be used by any of the AI agents in the SAS Enterprise or any of the non AI agent features as well … when it is called with a natural language query it will basically go and figure out what data has to be fetched from which of the transactional data warehouse or AI native store system how it has to be fetched et cetera and then it will give it back to its client. … most of the times developers don't know how to supply data to these prompts to these AI agents for personalization or for their basic execution. So this second AI system will know how to get the data what data to get and where to get it from in the SAS enterprise."
- **Best-known production approach:** Semantic layers (dbt Semantic Layer, Cube.dev, Looker LookML — schema-driven, not natural-language). Text-to-SQL (Vanna, sqlcoder — single-store). RAG frameworks (LangChain retrievers, LlamaIndex — per-agent integrations, not shared infra). AI data agents (Numbers Station, Hex Magic — human-facing exploration, not infra-for-other-agents). **None target "shared infrastructure for both AI and non-AI clients across all stores."**
- **Advantages of user's approach:** Centralizes data access governance — one place to audit who fetched what for whom. Lifts context-supply burden from agent authors (a major pain point). Single integration point for prompt context. Treating non-AI features as clients is unconventional and expands the value.
- **Disadvantages of user's approach:** NL → multi-store-fetch accuracy is an active research area; failure modes are subtle (wrong-store retrieval, partial answers). Latency overhead from the extra hop. Black-box risk — debuggability and observability matter a lot.
- **Novelty assessment:** high. Sharing across AI + non-AI clients across transactional + DW + AI-native stores is a fresh framing. RAG-as-a-service exists but only for AI clients on vector stores. The framing as enterprise infra rather than a per-agent integration is the novel piece.
- **Recommended next step:** v1 phase fit; design ADR in STORY-009 covering API spec + dispatch heuristic + observability.

### Idea — Agent Platform + Omnichannel Orchestrator with 6 explicit registries

- **Domain:** AI platform / agent infrastructure
- **Date raised:** 2026-04-28
- **Source:** session 495b8223, Q2 differentiator discussion (STORY-008)
- **Idea (user's words):** "There has to be a 3rd AI system in the SAS Enterprise which will be an agent platform … it will have its AI skills registry it will have its subagent registry it will have its tool registry it will have its AI native widget or component registry for UI it will have its UI shell for conversation with scrolling interface it will have its non UI interface for embedding it inside static widgets or some other kinds of experiences which are not exactly conversational. It will [decide] which tool or which agent or which skill to produce what result for the customer based on the situation."
- **Best-known production approach:** LangChain/LangGraph (single-channel default, no formal registry decomposition), OpenAI Assistants (vendor-locked, 1-2 registries), Anthropic Skills (early, skill-only), Vercel AI SDK (UI-shell-focused), Microsoft Copilot Studio (ecosystem-locked), Voiceflow / Botpress / Rasa (chatbot-channel-focused). **No OSS platform exposes all 6 registries (skills + subagents + tools + UI widgets + UI shell + non-UI embed) AND covers web + mobile + telephonic + static-widget surfaces under one orchestrator.**
- **Advantages of user's approach:** Clear architectural decomposition — registries are operational primitives that ops teams can govern. Omnichannel matches real SaaS surfaces. Non-UI embed (static widgets, in-app inserts, server-rendered surfaces) is a frequently-requested feature missing from most agent platforms. Subagent registry (separate from skills + tools) is a less-common but useful primitive.
- **Disadvantages of user's approach:** 6 registries is a lot to build well — risk of partial/half-baked implementations. Telephonic surface is a different beast (ASR/TTS, audio latency, telephony providers); possibly its own subsystem. Centralized orchestrator can be a bottleneck if not carefully designed.
- **Novelty assessment:** medium-high. The 6-registry decomposition is fresh. Existing platforms have 2-3 registries; the explicit separation of subagent + UI-component + non-UI-embed as their own first-class primitives is new. Omnichannel + non-UI-embed unified under one platform is novel.
- **Recommended next step:** MVP-1 subset (skills + tools + chat UI shell), full v1 (subagents + AI widgets + non-UI embed), v2 (telephonic). Design ADRs in STORY-009: orchestrator-decision-engine spec, registry interfaces, surface adapter spec.

### Idea — LLM Gateway + Safety + Model Hub + Eval/Feedback + Cost as one unified subsystem

- **Domain:** AI platform / LLM infrastructure
- **Date raised:** 2026-04-28
- **Source:** session 495b8223, Q2 differentiator discussion (STORY-008)
- **Idea (user's words):** "There has to be an 4th AI system in the SARS Enterprise which will be responsible for making sure that whatever 3rd party proprietary LLM API calls are being made from the agents within the SAS enterprise they are secure they don't have sensitive data they don't generate profanity or illegal advice All sorts of checks will be applied for a prompt injection and security. This 4th AI system will also make sure that the latest and the greatest models are available and it will also make sure that in house open source LLM models can be hosted and fine tuned and made available just like the outside models. It will also have evil [eval] and feedback system for all the agent runtimes to use out of the box it will have all sorts of bells and whistles which are required for observability as well for the AI agent systems. There will be cost dashboards for AI agents and there will be ways to place requests for provisioned throughput UN [user notification?] for these AI agents."
- **Best-known production approach:** Each layer is a product on its own:
  - LLM gateways: Portkey, Helicone, LiteLLM, OpenRouter, AWS Bedrock
  - AI safety / guardrails: Lakera, NeMo Guardrails, Llama Guard, Azure Content Safety
  - Model hubs: Hugging Face, Replicate, Together AI
  - Eval frameworks: Braintrust, LangSmith, Promptfoo, Patronus, Galileo
  - Cost monitoring: Helicone, Langfuse, Vellum
  - Provisioned throughput: cloud-vendor-specific (AWS Bedrock provisioned throughput, Azure OpenAI PTUs)
- None of the above ships as ONE subsystem of an OSS SaaS kit.
- **Advantages of user's approach:** One integration point for AI ops. Coherent eval+feedback loop, not bolted-on. Cost dashboards naturally tied to safety + routing. Self-hosted-models + proprietary-models on equal footing — a real strategic edge if regulatory or cost concerns later force a switch.
- **Disadvantages of user's approach:** Each capability is a product on its own — building all of them well is massive scope. Risk of being "OK at everything, best at nothing." If a buyer just wants the gateway, they'll pick LiteLLM directly and skip our integrated version.
- **Novelty assessment:** medium. Individual mechanisms aren't novel — they're well-known products. The composition into a unified subsystem of an OSS SaaS kit IS moderately novel because no existing kit ships this layer at all.
- **Recommended next step:** **MVP-1 candidate** (foundational; without it the other AI systems can't be safely operated). Minimum MVP-1: LLM gateway + safety/guardrails + cost dashboard. v1: eval + feedback + model hub. ADR in STORY-009 covering provider adapter spec + safety policy framework.

### Idea — AI-assisted upstream merge (subscribe-to-upstream agent)

- **Domain:** kit-promise / internal ops / dev productivity
- **Date raised:** 2026-04-28
- **Source:** session 495b8223, Q3 kit-promise discussion (STORY-008); assistant-surfaced angle, user confirmed in scope
- **Idea (assistant-surfaced, user-confirmed):** "OSS kit ships an AI agent that helps you upgrade as a first-class feature." The agent detects upstream package updates, examines user customizations via adapter usage signatures, proposes a merge plan minimizing friction, tests the proposed merge against the user's test suite, and surfaces conflicts to a human only when AI confidence is low. Lives at the intersection of AI Subsystem 5 (Internal Ops Agent) and the kit-promise mechanism (D-16).
- **Best-known production approach:** Manual git merge / `package update` (the universal default — engineer reads release notes, runs the update, fixes the fallout). Dependabot / Renovate auto-PR for dependency bumps but with no semantic understanding of user customizations. GitHub Copilot Workspace / Cursor / Devin can help merge if explicitly asked but aren't integrated with a kit's customization model. LLM-assisted merge tools are emerging (early POCs for merge-conflict resolution) but none ship as a first-class feature of an OSS SaaS kit.
- **Advantages of approach:** Direct attack on the "first engineer doesn't want to maintain platform code" pain (D-13) — even the act of staying current is automated. Combines two competitive moats (AI-first + subscribe-to-upstream) into one feature. Adapter usage signatures give the agent semantic context that generic dev agents lack — it knows what's a kit-supplied path vs. a user-customized path. Confidence-scored escalation preserves engineer time for the genuinely-hard merges.
- **Disadvantages of approach:** Trust ladder is steep — engineers need to verify the agent before trusting it autonomously. Test-suite quality determines agent confidence; if user tests are weak, the agent's "high confidence" signal becomes meaningless. Misaligned merges in subtle paths (e.g., adapter contract drift between minor versions) are exactly the bugs hardest to catch. Liability if the agent breaks production — careful guardrails needed.
- **Novelty assessment:** medium-high. Component mechanisms exist (LLM merge POCs, Dependabot, Devin-style agents) but the composition — kit-aware agent that understands adapter usage + surfaces only low-confidence conflicts + integrated as a first-class kit feature, not a third-party add-on — isn't documented in any OSS kit I'm aware of.
- **Recommended next step:** **MVP-1+ feature.** Basic version (detect + propose + test) ships with MVP-1 LLM Gateway (AI Subsystem 4). Full version (confidence scoring + autonomous-mode toggle) lands in v1 alongside the merge-helper subset of AI Subsystem 5. Design ADR in STORY-009 covering: adapter usage signature spec, agent confidence scoring methodology, autonomous-mode authorization model, rollback / circuit-breaker behavior.

### Idea — AI Coworker Platform for Internal Ops with full local-architecture awareness

- **Domain:** internal ops / AIOps / dev productivity
- **Date raised:** 2026-04-28
- **Source:** session 495b8223, Q2 differentiator discussion (STORY-008)
- **Idea (user's words):** "There will be another AI system in the SAS Enterprise which will allow the control of all the SA components and capabilities and layers via AI Agent coworkers for the SAS Enterprise employees. This AI system will allow the deployment the triage the maintenance the discovery the change management the the observability the the development and everything to be possible via AI agent coworkers so that anyone can just give instructions to these AI agent Co workers and then they would just do the stuff for you and get the information for you. This AI Agent this AI system will be aware of all the capabilities and layers and systems within the SAS enterprise and what their endpoints are what their API contracts are what their event schema is what their responsibilities are what's the logic written in them Not just the standard SAS enterprise components but also the product related capabilities which will get created within the Saas Enterprise and feature related components which will get created."
- **Best-known production approach:** GitHub Copilot Workspace, Cursor, Devin (dev-focused, generic). Glean, Notion AI (knowledge-focused, generic). Tabnine, Sourcegraph Cody (code-search, generic). AIOps platforms: PagerDuty AIOps, Moogsoft, BigPanda (incident-focused, generic). **No unified internal-ops agent platform exists with awareness of the LOCAL SaaS architecture (capabilities + endpoints + schemas + code logic + product extensions).** The closest analogues are bespoke per-company internal tools.
- **Advantages of user's approach:** Massive productivity multiplier — founder + first engineer can run a 5-person SaaS like a 25-person team. Strongly differentiated, even sophisticated platform teams don't have this. Natural extension of the kit's "we know the architecture" advantage. Awareness of product-specific extensions (not just kit subsystems) is the key differentiator from generic AIOps.
- **Disadvantages of user's approach:** Hard to build — needs deep introspection into every kit subsystem PLUS user-added extensions. Security implications: an agent that can deploy needs serious guardrails (multi-step approval, blast-radius limits, rollback). Risk of being the kit's most fragile piece — operational confidence depends on it. Failure modes hurt: a bad ops agent ships a broken deploy.
- **Novelty assessment:** high. Built-in subsystem of an OSS SaaS kit, with LOCAL architecture awareness across all subsystems (kit + user product extensions), is novel. Closest analogue is Devin-style agents, but Devin is general-purpose; the user's framing is SaaS-architecture-aware AND ships as part of the kit.
- **Recommended next step:** v2 (depends on Systems 1-4 mature; needs the kit's other subsystems stable enough for the agent to operate on them). Design ADR in STORY-009: capability-introspection protocol, action approval-and-rollback model, agent-vs-human authorization model.

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
