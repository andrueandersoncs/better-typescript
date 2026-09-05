---
name: review-skill-router
description: Independently assess an agent skill router's context gathering, situation matching, and handoffs. Use when an existing router needs a verdict or corrective findings rather than edits.
---

# Review Skill Router

Read [`../canonical-design.md`](../canonical-design.md) before reviewing.

## Inputs

- The existing router and its destination skills
- Its intended purpose, callers, and representative requests with context

## Method

1. Read the router, its shared guidance, destination skills, and nearby skill descriptions.
2. Check whether it gathers the facts that distinguish plausible matches, chooses by contextual meaning, and passes the original request and relevant evidence to one selected skill.
3. Exercise the canonical guide's routing checks in fresh context, covering every pattern. Record the selected skill and handoff for each case.
4. Check that destination skills can handle their matched situations. Flag unsupported matches, missing context, ambiguous patterns, lost handoff information, broken links, and duplicated instructions.
5. Do not change the target.

## Output

An independent verdict with evidence-backed findings ordered by consequence, or a pass when none remain. Routing cases cover every pattern, context gathering, selected skills, handoffs, and scope boundaries.