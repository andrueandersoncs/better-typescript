---
name: build-agent-memory
description: Build persistent agent memory with verified updates, retrieval, provenance, and access boundaries.
---

# Build Agent Memory

Separate evidence, distilled knowledge, and deterministic state. Saving a conversation is storage; memory begins when the system selects, verifies, organizes, retrieves, and updates what matters.

## Method

1. Define the behaviors memory must improve and the evaluation that will detect improvement.
2. Choose the representation by need:
   - Episodic records for events and provenance.
   - Semantic records for stable facts and concepts.
   - Procedural records for reusable strategies.
   - Typed state for permissions, counters, constraints, and aggregation.
3. Read llm-wiki's [evidence contracts](../../../llm-wiki/SKILL.md#preserve-the-contracts), [reconciliation](../../../llm-wiki/SKILL.md#lint-the-wiki), and [compaction](../../../llm-wiki/SKILL.md#compact-the-wiki) for memory maintenance. Apply their source-preservation, provenance, and consistency rules to the chosen backing store; Git, Markdown layout, and commit operations apply only to a Git-backed wiki.
4. For user memory, follow the lifecycle: retrieve relevant memory, selectively extract and abstract candidates from the new interaction, verify them against evidence and policy, then update.
5. For each candidate memory, record scope, source, time, confidence, permissions, and expiry or invalidation conditions.
6. Retrieve with the simplest measured pipeline. Begin with structured filters plus dense or sparse search; add hybrid fusion and reranking only when evaluation proves a recall gap.
7. Keep a small structured overview resident in context and retrieve raw detail with provenance on demand. Test retrieval and downstream answers after maintenance.

## Retrieval checks

Measure separately:

- Whether the needed evidence was retrieved.
- Whether its rank was useful.
- Whether the model applied it correctly.
- Whether the answer retained provenance.

Use recall at k, MRR, or nDCG only as diagnostic measures. Goodhart's Law applies: retrieval scores are proxies for useful behavior.

## Boundaries

- Keep tenant and permission filters outside semantic similarity.
- Use [secure-system](../../../software-craft/references/secure-system/SKILL.md#method) for secret handling and enforcement at the memory access boundary.
- Use external knowledge for facts that require updates, citations, access control, or deletion.
- Treat every observable memory format as a future interface under Hyrum's Law; version deliberately.

Source: *Building AI Agents*, Chapter 3, “Memory and Knowledge.”
