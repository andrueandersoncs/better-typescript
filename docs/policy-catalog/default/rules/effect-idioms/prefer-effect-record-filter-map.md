# prefer-effect-record-filter-map

## Classification

Reported default policy; Effect collection idiom; file-local syntactic detection.

## Active wiring

Listed through effectCollectionPolicies in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectRecordFilterMap.ts
- packages/matchers/src/builtins/preferEffectRecordFilterMap.ts

## Intent

Replace conditional object spreading used to omit absent entries with Record.filterMap.

## Detection boundary

Finds spread assignments whose expression is a conditional with exactly one empty object-literal arm and one non-empty object-literal arm, after expression unwrapping.

## Exemptions and non-findings

Unconditional spreads, conditionals outside spreads, two populated or two empty arms, and arms represented by variables rather than qualifying object literals are not findings.

## Guidance

Build candidate entries and use Record.filterMap with Result-based presence.

## Dependencies

TypeScript AST and expression unwrapping only.

## Tests and examples

- tests/preferEffectRecordFilterMap.test.ts
- tests/fixtures/prefer-effect-record-filter-map/
- packages/guidance/examples/prefer-effect-record-filter-map/

## Skill migration

- Proposed skill: lint-rule-prefer-effect-record-filter-map
- Scope: local file
- Required semantic context: spread/conditional/object-literal AST
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse preferEffectRecordFilterMapMatcher

## Open questions

None identified.
