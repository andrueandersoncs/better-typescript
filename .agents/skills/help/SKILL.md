---
name: help
description: Gather task context and select one specialist for marketing, writing, planning, product, projects, wikis, Grok Bots, agent systems, skills, software laws, or engineering.
---

# Help

Match the user's situation to the skill best suited to handle it.

Read [the shared routing guide](references/skill-routers/references/canonical-design.md) and use its gather → match → handoff procedure with these patterns.

| Situation pattern | Skill |
| --- | --- |
| An agent skill router needs explaining, designing, implementing, or auditing. | [`skill-routers`](references/skill-routers/SKILL.md) |
| LoRA training is already chosen: a source skill needs distilling into a small adapter with a sealed comparison against that skill. | [`distill-skill-to-model`](references/distill-skill-to-model/SKILL.md) |
| Grok Bot capabilities, skills, routines, roster, autonomy rules, handoffs, or templates need creating or changing. | [`grok-bot`](references/grok-bot/SKILL.md) |
| A persistent Git-backed LLM wiki needs setting up, ingesting sources, answering queries, linting, or compacting. | [`llm-wiki`](references/llm-wiki/SKILL.md) |
| An agent system's harness, context, memory, tools, interaction, coding loop, evaluation, training strategy, learning loop, or multi-agent architecture needs designing or improving; or an existing skill needs compiling into a cheaper runtime representation without an already-chosen LoRA target. | [`agent-systems`](references/agent-systems/SKILL.md) |
| A multi-task project needs a durable record to coordinate work, blockers, asynchronous results, review, or resumption. | [`manage-project`](references/manage-project/SKILL.md) |
| A plan, estimate, proposal, roadmap, or strategy needs testable forecasts, probabilities, and response rules. | [`predictive-planning`](references/predictive-planning/SKILL.md) |
| Product capabilities, features, journeys, requirements, releases, positioning, customer evidence, or AI opportunities need defining or maintaining in a durable product record. | [`product-management`](references/product-management/SKILL.md) |
| Customer research, pricing or packaging decisions, persuasive marketing-page copy, organic-search audits, or lifecycle email sequences need a focused workflow. | [`marketing`](references/marketing/SKILL.md) |
| A workflow needs a source-grounded callstack trace, state-machine projection, or both, without executing it. | [`workflows`](references/workflows/SKILL.md) |
| Technical documentation needs creating, restructuring, or auditing around a reader's learning, task, lookup, or understanding need. | [`technical-documentation`](references/technical-documentation/SKILL.md) |
| Existing prose needs editing or auditing for AI-writing patterns while preserving its meaning and voice. | [`deslop`](references/deslop/SKILL.md) |
| Established software laws need explaining, applying to a decision, or assessing against evidence from a concrete case. | [`software-laws`](references/software-laws/SKILL.md) |
| A concept, prompt, design direction, name, narrative, or other creative artifact needs developing for novelty and taste. | [`elicit-llm-creativity`](references/elicit-llm-creativity/SKILL.md) |
| Engineering work on executable software, infrastructure, libraries, services, or single-workflow agent skills needs investigation, scoping, repository mapping, design, planning, a claimable work queue, implementation, review, verification, delivery, coordination, or knowledge transfer. | [`software-craft`](references/software-craft/SKILL.md) |
