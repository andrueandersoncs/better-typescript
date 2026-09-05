---
name: author-agent-skill
description: Create or improve reusable single-workflow agent skills, including consolidation and prompt-to-skill extraction.
---

# Author Agent Skill

Create a skill only when a recurring task needs guidance the model would not reliably infer.

## Method

1. Define the recurring outcome, intended callers, and evidence of completion. Keep project-private procedure in project instructions.
2. Inspect existing skills and choose one owner for overlapping behavior. Consolidate instead of adding another competing trigger.
3. Write a short, discriminating description that says what the skill does and when it applies.
4. Keep behavioral cases beside the source skill when its contract needs them. Use fresh fixtures and observable outcomes, not checks of instruction wording. For compilation, split development and acceptance by task family before candidate work using the shared comparison method.
5. Keep `SKILL.md` to shared decisions and constraints. Link mode-specific procedures, examples, schemas, scripts, and assets only where they become relevant.
6. Describe outcomes and decision criteria. Use exact sequences or numerical rules only when deviation causes a concrete failure.
7. Preserve the user's scope, permissions, repository conventions, and portable source facts.
8. Validate frontmatter, links, and host discovery. Exercise changed routing and behavior in fresh context; choose cases that expose a plausible mistake, and tighten only wording linked to an observed failure.
9. Keep the skill as source unless measured required behavior and deployment cost justify a lower-cost candidate. Only then use [compile-agent-skill](../../../agent-systems/references/compile-agent-skill/SKILL.md); it compares the frozen source through sealed acceptance and does not replace ordinary authoring.

## Artifact context

When the requested artifact is a project-local verification skill, apply [the verification skill context](references/verification-harness.md) within this authoring workflow.

## Output

A created, consolidated, or revised skill with only the resources its workflow needs.

## Done

The skill routes on its intended request, avoids adjacent work, has one canonical source for each rule, and changes a target decision the model would otherwise miss. Use a fresh no-skill comparison through the [behavioral comparison method](../../../agent-systems/references/evaluate-agents/references/comparison-method.md) when that last claim is uncertain.
