---
name: compile-agent-skill
description: Compile an established Agent Skill into a lower-cost candidate while retaining measured required behavior through sealed artifact evaluations.
---

# Compile Agent Skill

Use this only when a versioned source skill already meets its required behavioral cases and measured deployment cost creates a need for a lower-cost implementation. Keep the source skill and its runtime as the canonical, discoverable system. For a direct, already-chosen LoRA workflow, use [distill-skill-to-model](../../../distill-skill-to-model/SKILL.md) instead; do not invent a multi-backend compilation framework.

Use [author-agent-skill](../../../software-craft/references/author-agent-skill/SKILL.md) to refine the source and colocated cases, and [evaluate-agents' comparison method](../evaluate-agents/references/comparison-method.md) for bounded comparison. Those specialists own authoring and evaluation support; this workflow only coordinates compilation.

## Method

1. Lock the complete source package and one versioned runtime manifest. State the required observable behavior, source-system cost, and lower-cost need. Do not compile vague equivalence claims.
2. Colocate development cases with the source skill. They must ask for artifact edits or writes and verify allowed changed files and resulting bytes. Before creating candidates, seal a separate acceptance suite in distinct task families.
3. Use the repository [compiler runner](../../../../../../scripts/compile-skill.ts) to seal cases, develop candidates, and accept a frozen candidate. This runner is checkout-only repository tooling, not an installed-skill capability; keep its CLI documentation with the repository tooling.
4. Select on development evidence only. Start from the current candidate, try one bounded deletion or simplification, and retain it only when it clears the predeclared required-behavior and cost rule against the matched baseline. Evaluate the whole current candidate after every deletion: deletions interact cumulatively, so individual wins do not compose.
5. When development selects a candidate, freeze its exact bytes, source/runtime versions, and selection record. The trusted acceptance evaluator loads the holdout only after selection; evaluated agents receive their current task and fixture, never the suite or expected checks.
6. Accept or reject from the sealed result. Rejection preserves the source skill and records the failed contrast. Acceptance produces a candidate artifact and evidence, never an automatic deployment or source/discovery mutation.

## Boundaries

- Default artifacts live outside skill discovery under `.scratch/skill-compilation`; do not write candidates into the source skill directory or installed skill copies.
- Compare a no-skill baseline, the source system, and the candidate on matched fixtures. Report success by family and total cost per success, not a claim of universal behavioral equivalence.
- Keep deterministic process, validation, tools, large references, and mutable knowledge in the runtime. Compilation may change only the stable policy that the cases measure.
- Stop when the source system is already cheap enough, cases do not support a measured requirement, or no deletion survives development. Do not deploy a rejected candidate.

## Done

A frozen candidate has either passed its sealed bounded acceptance decision with its provenance and cost report, or been rejected without changing the source skill or its discovery.