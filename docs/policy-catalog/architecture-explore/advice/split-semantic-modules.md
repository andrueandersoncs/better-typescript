# split-semantic-modules

## Classification

Derived file-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; produces findings when `semantic-module-placement` evidence is active.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/architectureExploreDerive.ts`
- Evidence: `semantic-module-placement`

## Intent

Report a Semantic Module whose members are spread across several Physical Modules.

## Detection boundary

Group split placement evidence by its anchor path and emit one block per anchoring file. List every
member of each spanning Semantic Module in canonical order, with its declaration kind and location,
plus the current Physical Modules the module occupies.

## Exemptions and non-findings

Single-file Semantic Modules produce nothing. The anchor is the canonical first member, not a
destination: the advice never picks a target file or a move direction, and never proposes deleting,
inlining, or merging entities to shrink a module.

## Guidance

Place every listed member of one Semantic Module in one Physical Module.

## Dependencies

Consumes semantic-module-placement evidence.

## Tests and examples

- `tests/semanticModulePlacementAdvice.test.ts`
- `packages/guidance/examples/semantic-module-placement/`

## Skill migration

Proposed skill: `lint-rule-split-semantic-modules`. Scope: Program/file. Consume the deterministic
partition; an agent chooses the destination file that the advice deliberately withholds.

## Open questions

Whether an agent should propose destinations for modules that span more than two Physical Modules.
