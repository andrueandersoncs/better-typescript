---
name: plan-change
description: Turn an accepted software outcome or contract into dependency-ordered, vertically sliced, independently verifiable work. Use for multi-file changes, implementation tickets, migrations, uncertain sequencing, or plans another agent must execute.
---

# Plan Change

## Inputs

The accepted outcome or contract, relevant repository map, constraints and exclusions, ownership boundaries, and required completion evidence.

## Method

1. Confirm the accepted outcome, contract, exclusions, and evidence source. Map only the code needed to plan accurately.
2. Separate decisions from implementation. Put unresolved decisions into research or prototype work rather than disguising them as coding tasks.
3. Build the dependency graph. Identify the ready frontier and the critical path.
4. Prefer thin vertical slices that produce observable behavior. Order contract-first or risk-first when that creates earlier evidence.
5. For an unavoidable wide change, use [ship-change's migration sequence](../ship-change/SKILL.md#migration), ordering bounded consumer batches by dependency.
6. Write each task as a self-contained execution unit with:
   - outcome and acceptance criteria;
   - exact likely files and public seams;
   - dependencies and owner;
   - focused command or runtime scenario;
   - expected evidence, including the intended failing state when test-first;
   - rollback or compatibility rule when relevant.
7. Keep tasks small enough for one context and one review, but complete enough to demonstrate value. Remove tasks that create no evidence, reduce no risk, and deliver no behavior.
8. Place checkpoints before expensive or irreversible commitments. For consequential uncertainty, use [predictive-planning](../../../predictive-planning/SKILL.md) for predicted observations, triggers, responses, and authorized decision owners. Link the forecast record; keep the requested executable task graph here, including for routine work.

## Output

An acyclic implementation plan of self-contained, dependency-ordered, evidence-producing vertical slices.

## Done

Every task is executable without hidden conversation state, blockers form an acyclic graph, and the plan predicts observable evidence rather than activity.