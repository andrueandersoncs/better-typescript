# hub-module

## Classification

Derived file-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; available in every Architecture Explore wiring.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/hubModule.ts`
- Evidence: `interface-burden`, `module-graph`, and workspace import edges

## Intent

Find a broad Module that both aggregates many dependencies and attracts multiple callers.

## Detection boundary

For a production Module, require at least 12 interface operations, production fan-in from at least
three distinct Modules, and fan-out to at least six distinct Modules. All three legs must meet threshold.

## Exemptions and non-findings

Ignore test Modules, test-origin fan-in, missing workspace paths, or candidates below any one threshold.

## Guidance

Split along consumer seams so each caller depends on one smaller interface.

## Dependencies

Consumes interface burden and module graph through workspace import joins.

## Tests and examples

- `tests/architectureExploreStructureAdvisers.test.ts`
- `packages/guidance/examples/hub-module/`

## Skill migration

Proposed skill: `lint-rule-hub-module`. Scope: workspace graph. Run in the architecture advice phase
with deterministic operation and fan-in/fan-out measurements.

## Open questions

None identified.
