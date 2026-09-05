---
name: prototype-options
description: Answer a high-value design question with a disposable runnable prototype or divergent UI variants. Use when implementation is cheaper and clearer than debate, especially for state models, interaction design, visual direction, or unfamiliar technical risk.
---

# Prototype Options

## Inputs

One decision question, candidate directions or constraints, representative scenario, disposable-work boundary, and evidence threshold.

## Method

1. State one question the prototype must answer and the decision it will unlock.
2. Protect production work with an isolated route, directory, branch, or worktree.
3. Choose the form:
   - **Logic probe:** one dependency-light runnable model with controls and representative scenarios.
   - **UI comparison:** exactly three materially different full-size runnable variants, each differing on a named structural axis and switchable in the same context.
     Use [elicit-llm-creativity](../../../elicit-llm-creativity/SKILL.md) for needed direction generation or critique; keep the three runnable comparison surfaces as the deliverable.
   - **Technical spike:** the smallest executable path through the riskiest dependency or integration.
4. Reuse realistic data and surrounding context. Include only behavior needed to answer the question.
5. Run the prototype. Exercise each scenario or variant, inspect runtime output, and capture the evidence.
6. Present the decision, tradeoffs, and recommendation. Stop for human selection when taste or product direction controls.
7. Move only the validated contract or selected direction into production. Remove the prototype surface or preserve it on a clearly throwaway branch when it remains useful evidence.

## Constraints

Skip production polish, broad tests, migrations, persistence, and abstractions unless the question specifically depends on them.

## Output

A disposable executable probe or comparison with observed evidence and the decision it supports.

## Done

The prototype changes or confirms a named decision. A prototype that merely demonstrates that code can be written is incomplete.