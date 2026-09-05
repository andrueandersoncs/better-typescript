---
name: define-work
description: Resolve unclear software intent into an agreed outcome, success test, constraints, and decision boundary. Use for vague requests, new ideas, consequential behavior changes, or disagreements about what should be built.
---

# Define Work

## Inputs

The software request, existing product records and repository evidence by reference, constraints, decision authority, and known success conditions.

## Method

1. Inspect available repository and product facts before questioning the user.
2. State the current best one-sentence outcome hypothesis and what remains uncertain.
3. Separate discoverable facts from human decisions. Research the facts; ask only the currently unblocked decision frontier, with a recommendation for each choice.
4. Classify the work:
   - **Probe:** one cheap experiment answers the central question.
   - **Bounded change:** the outcome and affected surface fit one implementation cycle.
   - **System change:** independent capabilities, public contracts, or costly commitments require a written design.
5. Explore materially different approaches only where the choice can change the outcome. Compare user value, feasibility, reversibility, and evidence.
6. Reuse accepted product claims by reference and record only unresolved software decisions and changed acceptance conditions. When no such record exists, capture:
   - user and outcome;
   - reason now;
   - observable success test;
   - binding constraints;
   - explicit non-goals;
   - unresolved decisions and cheapest evidence for each.
7. Obtain explicit agreement for subjective, architectural, or irreversible choices. Proceed directly on clear mechanical work.

Use [product-management](../../../product-management/SKILL.md) when the requested deliverable is durable product truth; clarification of a software outcome does not require a new product record.

## Output

One accepted, testable software outcome with explicit constraints, success evidence, and ownership for every remaining unknown.

## Done

The user and agent share one testable outcome, and every remaining unknown has an owner: research, prototype, implementation, or human decision.
