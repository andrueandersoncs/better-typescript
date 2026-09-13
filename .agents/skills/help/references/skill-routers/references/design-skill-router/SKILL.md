---
name: design-skill-router
description: Explain or design a skill router when its selection patterns and responsibilities need defining.
---

# Design Skill Router

Read [`../canonical-design.md`](../canonical-design.md) before designing.

## Inputs

- The router's intended purpose and representative requests
- Available context, existing skills, and router files

## Method

1. For an explanation, explain contextual matching with an example relevant to the user's question, then stop.
2. Otherwise inspect representative requests and existing skills. Identify the contextual facts that change which skill should handle a request.
3. Describe each recognizable situation and map it to one skill. If a skill is missing, define what it needs, does, and produces.
4. Identify where the agent can gather the distinguishing facts and what context each selected skill needs in its handoff.
5. Exercise the patterns using [the routing checks](../writing-patterns.md#checking-a-router). Resolve overlaps and remove distinctions that never change the selection.

## Output

The requested explanation, or a situation-to-skill mapping with context sources and observed routing cases showing that representative requests select the intended skills and receive useful handoffs.