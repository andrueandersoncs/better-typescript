---
name: implement-skill-router
description: Implement contextual situation patterns and skill handoffs in repository files. Use when the intended patterns and destination skills are understood and the router needs creating or updating.
---

# Implement Skill Router

Read [`../canonical-design.md`](../canonical-design.md) before editing.

## Inputs

- The intended situation patterns, destination skills, and relevant context
- The target skill directory and applicable repository conventions
- Existing router files and required source material when present

## Method

1. Inspect the target, related skills, and repository conventions. Preserve unrelated work.
2. Create or update the router's `SKILL.md` with a clear discovery description, situation-to-skill mapping, and a link to the canonical gather → match → handoff procedure.
3. Link to existing destination skills. Only when required behavior has no owner, use [author-agent-skill](../../../software-craft/references/author-agent-skill/SKILL.md) for a missing direct workflow and return its artifact and evaluation evidence to this router owner. For a missing destination router, use this workflow.
4. Migrate affected callers and remove obsolete routes and dead references within the target.
5. Exercise the canonical guide's routing checks in fresh context. Observe both selection and the context passed to the selected skill.
6. Check frontmatter names, reference paths, and actual host discovery when available.

## Output

The implemented router and changed paths, with fresh-context results showing context gathering, intended skill selection, and useful handoffs. References resolve and affected callers use the current routes.