# hard-to-test-hotspot

## Classification

Derived file-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; meaningful in OOP, FP, or combined fleets according to available evidence.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/hardToTestHotspot.ts`
- Evidence: `external-dependency-construction` and `module-scope-effects`

## Intent

Identify files where multiple runtime or collaborator constructions make behaviour hard to isolate.

## Detection boundary

Emit when a file contains at least two total facts across imported collaborator construction and
module-scope/runtime Effect execution. Report separate counts for both evidence kinds.

## Exemptions and non-findings

A single construction is below threshold. Composition roots, tests, direct factories, and nested
built-in I/O excluded by the upstream evidence remain non-findings.

## Guidance

Classify the dependency, construct production adapters at the root, and introduce a port only when a
real test adapter supplies a second implementation.

## Dependencies

Consumes OOP and FP construction evidence.

## Tests and examples

- `tests/architectureExploreDerive.test.ts`
- `packages/guidance/examples/hard-to-test-hotspot/`

## Skill migration

Proposed skill: `lint-rule-hard-to-test-hotspot`. Scope: file with role and import context. Run after
OOP/FP candidate extraction; allow either fleet to contribute evidence.

## Open questions

None identified.
