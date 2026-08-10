# semantic-module-placement

## Classification

Silent Program-level Architecture Explore evidence policy.

## Active wiring

`architectureExplorePolicies`; enabled by every Architecture Explore wiring and by the repository's
own `selfHostPlacementWiring`.

## Implementation sources

- Guidance: `packages/guidance/src/preset/semanticModulePlacementPolicies.ts`
- Matcher: `packages/matchers/src/builtins/architectureExplore/semanticModuleEngine.ts`
- Evidence: `SemanticModulePlacementData`

## Intent

Partition first-party Code Entities into Semantic Modules from TypeChecker-resolved facts and record
where a Semantic Module and its Physical Module disagree.

## Detection boundary

Build one Semantic Reference Graph per Program and stratum, then close the neutral Hard Bond catalog:
`semantic-reference-cycle`, `semantic-subject-ownership`, and `exclusive-consumer-ownership`.
Membership is the least equivalence relation over accepted bonds. Emit split evidence when one
Semantic Module spans multiple files and mixed evidence when one file holds multiple Semantic
Modules, anchored at the canonical first member.

## Exemptions and non-findings

Names, paths, directories, current co-location, export syntax, consumers outside the Program, scores,
and thresholds never affect membership. Production and test strata partition separately. A candidate
crossing a Partition Barrier becomes suppressed-bond evidence. Ownership is withheld when consumer
and target carry disjoint Semantic Subjects.

## Guidance

Feed split and mixed placement Advice without choosing a destination or move direction.

## Dependencies

Consumed by split Semantic Modules and mixed Physical Module advice.

## Tests and examples

- `tests/semanticModules.test.ts`
- `tests/semanticModulePlacement.test.ts`
- `packages/guidance/examples/semantic-module-placement/`

## Skill migration

Retain deterministic partition and proof construction as candidate support. Membership is a compiler
fact, not a judgement, so an agent may consume the partition but must not re-derive it.

## Open questions

Whether comparator and merge results should join the boolean verdict as subject-owning shapes; see
ADR-0025.
