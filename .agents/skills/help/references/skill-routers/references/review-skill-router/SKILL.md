---
name: review-skill-router
description: Assess an existing skill router for selection and handoff errors when findings are requested.
---

# Review Skill Router

Read [`../canonical-design.md`](../canonical-design.md) before reviewing.

## Inputs

- The existing router and its destination skills
- Its intended purpose, callers, and representative requests with context

## Method

1. Read the router, its shared guidance, destination skills, and nearby skill descriptions.
2. Check whether it gathers the facts that distinguish plausible matches, chooses by contextual meaning, and passes the original request and relevant evidence to one selected skill.
3. Exercise [the routing checks](../writing-patterns.md#checking-a-router) in fresh context, covering every pattern. Record the selected skill and handoff for each case.
4. Check that destination skills can handle their matched situations. Flag unsupported matches, missing context, ambiguous patterns, lost handoff information, broken links, and duplicated instructions.
5. Do not change the target.

## Output

An independent verdict with evidence-backed findings ordered by consequence, or a pass when none remain. Routing cases cover every pattern, context gathering, selected skills, handoffs, and scope boundaries.