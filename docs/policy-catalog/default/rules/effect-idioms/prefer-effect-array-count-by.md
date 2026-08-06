# prefer-effect-array-count-by

## Classification

Reported default policy; Effect collection idiom; file-local semantic detection.

## Active wiring

Listed through effectCollectionPolicies in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectArrayCountBy.ts
- packages/matchers/src/builtins/preferEffectArrayCountBy.ts
- packages/matchers/src/support/tsSignature.ts

## Intent

Use Array.countBy when filtering only to read the resulting length.

## Detection boundary

Finds .length on a direct Effect Array.filter call or an Effect pipe whose last stage is a one-argument partial Array.filter. Effect provenance is resolved across aliases, namespaces, and subpath imports; wrappers such as assertions are unwrapped.

## Exemptions and non-findings

Native Array.prototype.filter, local lookalikes, a filter result not counted, or a pipe with a later transformation are not findings.

## Guidance

Replace filter(...).length with Effect Array.countBy and remove a helper if that was its only behavior.

## Dependencies

TypeScript checker, Effect and Array-module symbol provenance, pipe recognition, and carrier unwrapping.

## Tests and examples

- tests/preferEffectArrayCountBy.test.ts
- tests/fixtures/prefer-effect-array-count-by/
- packages/guidance/examples/prefer-effect-array-count-by/

## Skill migration

- Proposed skill: lint-rule-prefer-effect-array-count-by
- Scope: local file
- Required semantic context: resolved Effect Array.filter and pipe stage sequence
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse preferEffectArrayCountByMatcher

## Open questions

None identified.
