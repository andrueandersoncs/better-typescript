---
name: transfer-knowledge
description: Move the minimum complete context to another person, agent, or future session in the form they can act on. Use for handoffs, questionnaires, explanation repair, durable teaching, operational instructions, or agent-facing documentation.
---

# Transfer Knowledge

## Inputs

The receiver, next decision or action, canonical source artifacts, current state, constraints, and delivery medium.

## Choose the knowledge artifact

These are output choices within `transfer-knowledge`, not routes to other skills:

- Active work changes owner or environment → create a **handoff**.
- A decision depends on another person's private knowledge → create a **questionnaire**.
- The previous explanation did not land → **rewrite from the missing premise** using the project's vocabulary.
- A person must perform an external procedure → create an **executable guide** with exact stages and value flow.
- Knowledge must persist across sessions → create a **learning artifact** with retrieval practice, or a **reference artifact** for lookup without compulsory exercises.

## Method

1. Identify the receiver, decision or action, available context, and delivery medium.
2. Reference canonical artifacts instead of copying them. Include only state that changes the receiver's next action.
3. Use the receiver's vocabulary; lead action-oriented sections with an operative word. For a requested prose edit after facts are established, use [deslop](../../../deslop/SKILL.md) in embedded/output-only mode, preserving code, citations, quotations, and uncertainty.
4. For handoffs, record goal, current state, decisions, evidence, changed paths, blockers, next action, and suggested component skills.
5. For questionnaires, ask the recipient only facts they uniquely know, ordered by decision value, with context and answer slots.
6. For requested guides, explanations, and references, use [technical-documentation](../../../technical-documentation/SKILL.md) for the matching type and proof contract. Map every manual procedure's stages, source values, destinations, expected state, and secret boundaries; verify its walkthrough.
7. Redact credentials and private data. Store temporary handoffs outside the repository unless the knowledge is durably project-relevant.

## Output

The smallest handoff, questionnaire, explanation, learning artifact, or procedure that lets the receiver take the next action.

## Done

The receiver can take the next action without the original conversation, and no duplicated artifact can silently drift from its source.