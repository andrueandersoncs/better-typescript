# 03 — Extract the Applicative relevance plan

**Specification:** [Declarative semantic review](../spec.md)

Status: ready-for-agent

Blocked by: 02

## What to build

Separate relevance-question declaration from relevance-question interpretation.

After route interpretation and deterministic evidence expansion, a pure constructor must declare all
candidate relevance judgments before any of them run. A concrete interpreter then evaluates those
known judgments and returns scored evidence. Fixed thresholding, ranking, and selection remain pure
policy after interpretation.

Keep request-size partitioning inside the concrete interpreter or its transport adapter. It must not
shape the semantic interface.

## Acceptance criteria

- [ ] A package-private relevance plan contains the rule, candidate evidence, stable question ids,
      and every independent Noul declaration.
- [ ] Its constructor performs no evaluator or external I/O.
- [ ] The interpreter evaluates only questions already present in the plan.
- [ ] Candidate identity, relevance probabilities, selected-evidence ordering, threshold, and maximum
      selection preserve current behavior.
- [ ] Physical request partitioning remains behaviorally compatible and is not exposed as a semantic
      dependency.
- [ ] A narrow test proves all relevance judgments are declared before the first evaluator call.
- [ ] Superseded mixed declaration/execution code is removed.
- [ ] `./scripts/check.sh` passes.

## Non-goals

- Changing relevance prompts, thresholds, or evidence limits.
- Constructing the final policy judgment.
- Sharing one generic plan type with routing.
- Optimizing request count, tokens, latency, or price.
