---
name: author-agent-skill
description: Create or improve reusable single-workflow agent skills, including consolidation and prompt-to-skill extraction.
---

# Author Agent Skill

Create a skill only when a recurring task needs guidance the model would not reliably infer.

## Process

1. Define the recurring outcome, intended callers, entry state, and evidence of completion. Keep project-private procedure in project instructions. Do not create a skill for guidance the model already applies reliably.
2. Inspect existing skills and choose one owner for overlapping behavior. Consolidate instead of adding another competing trigger.
3. Write a short description whose opening identifies the task that needs this skill. Keep workflow steps and keyword inventories in the body. Avoid triggers such as every edit or every completion claim that compete with ordinary work.
4. Write the smallest runnable process:
   - required inputs and entry conditions;
   - ordered actions where one result enables the next;
   - decision branches and the evidence that selects them;
   - the check, repair, and retry loop;
   - output, completion, and blocked conditions.
5. Put principles and quality criteria inside the step where they change a decision. They do not replace the operating sequence. Avoid incidental itineraries: prescribe exact order or numerical rules only where deviation can change the result.
6. Keep `SKILL.md` to shared decisions and the operating process. Link mode-specific procedures, examples, schemas, scripts, and assets only where they become relevant.
7. Keep behavioral cases beside the source skill when its contract needs them. Build them before changing the skill. Use fresh fixtures and observable outcomes, including a case where skipping, reordering, or failing to retry a consequential step produces the wrong result. For compilation, split development and acceptance by task family before candidate work using the shared comparison method.
8. Preserve the user's scope, existing authorization, repository conventions, and portable source facts. Ask for approval only at a real unresolved decision boundary. The process continues through its completion condition and relevant verification.
9. Validate frontmatter, links, and host discovery. Exercise the complete process in fresh context from entry through output, including one representative failure or branch when it can change the result. Tighten only wording linked to an observed failure.
10. Keep the skill as source unless measured required behavior and deployment cost justify a lower-cost candidate. Only then use [compile-agent-skill](../../../agent-systems/references/compile-agent-skill/SKILL.md); it compares the frozen source through sealed acceptance and does not replace ordinary authoring.

## Artifact context

When the requested artifact is a project-local verification skill, apply [the verification skill context](references/verification-harness.md) within this authoring workflow.

## Output

A created, consolidated, or revised skill with only the resources its workflow needs.

## Done

The skill routes on its intended request, avoids adjacent work, and has one canonical source for each rule. A fresh consumer can enter from the stated inputs, follow the process without inventing missing work order, recover from a representative failed check, and produce the intended verified result. Use a fresh no-skill comparison through the [behavioral comparison method](../../../agent-systems/references/evaluate-agents/references/comparison-method.md) when the skill's effect on that behavior is uncertain.
