# hypothetical-seam

## Classification

Derived file-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; consumes OOP or FP seam evidence according to the active fleet.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/hypotheticalSeam.ts`
- Evidence: `single-adapter-seams` and `context-tag-seams`

## Intent

Find behavioural abstractions that have not demonstrated real variation.

## Detection boundary

Include OOP single-adapter facts and Effect context seams with at most one production adapter and no
test adapter. Group by file. Add dead-seam evidence when an Effect seam also has zero consumers.

## Exemptions and non-findings

Preserve seams with a test adapter or more than one production adapter. An Effect seam meeting those
adapter conditions is ignored even if its consumer count is low.

## Guidance

Remove speculative ports until a second implementation varies; delete dead services with no consumers.

## Dependencies

Consumes single-adapter and Context-tag seam evidence.

## Tests and examples

- `tests/architectureExploreDerive.test.ts`
- `packages/guidance/examples/hypothetical-seam/`

## Skill migration

Proposed skill: `lint-rule-hypothetical-seam`. Scope: Program-wide adapter and consumer usage. Run in
the architecture advice phase with deterministic seam counts.

## Open questions

None identified.
