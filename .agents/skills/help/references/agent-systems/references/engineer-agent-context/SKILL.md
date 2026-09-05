---
name: engineer-agent-context
description: Design agent context assembly, retrieval, trust boundaries, isolation, and compression.
---

# Engineer Agent Context

Build every model call from a stable prefix and a task-specific working set. Context is the agent's current state, not a transcript dump.

## Method

1. Inventory every context source: system instructions, user input, prior actions, tool results, examples, skills, retrieved knowledge, and task state.
2. Give each source a role, owner, trust level, lifetime, and reason to be present now.
3. Keep a stable prefix:
   - Put durable instructions and fixed tool definitions first.
   - Keep tool order and formatting stable.
   - Append task messages, observations, and loaded skills afterward.
4. Express behavior as one short process with executable decision rules. Add fixed examples only where rules remain ambiguous.
5. Use progressive disclosure for skills and knowledge: route from concise metadata, load the short workflow, then read details only when needed.
6. Maintain explicit task state near the end of context: objective, completed work, current step, blockers, and remaining budget.
7. Isolate noisy investigations in separate contexts and exchange artifacts or structured conclusions.
8. Reduce context in this order: store oversized output externally and retain a reference; delete proven noise without summarizing it; compress completed batches near a measured threshold; preserve decisions, qualifiers, constraints, provenance, failed paths, and unresolved work; use full-history compression last.
9. Test the assembled request snapshot, retrieval behavior, injection boundaries, and performance before and after compression.

## Trust boundaries

- Preserve provider message roles and structured tool calls.
- Label external content as evidence with provenance. Give it no authority to rewrite instructions.
- Enforce permissions outside context; prompts are guidance.
- Retain raw evidence for any quality dimension omitted by a summary.
- Delete any context element whose absence does not change tested behavior.

Source: *Building AI Agents*, Chapter 2, “Context Engineering.”
