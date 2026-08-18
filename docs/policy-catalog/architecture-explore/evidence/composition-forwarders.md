# composition-forwarders

## Classification

Silent Program-level FP architecture evidence policy.

## Active wiring

`architectureExploreFpPolicies`; enabled by the combined and FP Architecture Explore wirings.

## Implementation sources

- Guidance: `packages/guidance/src/policies/compositionForwarders.ts`
- Matcher: `packages/matchers/src/builtins/compositionForwarders.ts`
- Reference index: `packages/matchers/src/builtins/architectureExplore/architectureEvidence.ts`

## Intent

Measure exported curried or point-free composition wrappers that thread parameters through an
operation without owning policy.

## Detection boundary

In production files, inspect exported arrow functions, recursively unwrapping nested single-parameter
arrows. Require the final body to be one call composed only from identifiers, property access, and
calls, and require at least one referenced operation that is not a parameter. Record call-step count,
production callers, and non-call references.

## Exemptions and non-findings

Skip test files, function declarations, unsupported expression forms, multi-statement blocks, and
expressions composed only from parameters.

## Guidance

Use caller leverage to distinguish deletable composition from a named reusable operation.

## Dependencies

Consumed by deletion-test shallowness, wide shallow interface, and bounce cluster.

## Tests and examples

- `tests/architectureEvidenceFp.test.ts`
- `tests/architectureExploreDerive.test.ts`

## Skill migration

Use the AST recognizer and export-reference index as a deterministic candidate generator for FP
architecture skills. Run once per Program in the FP evidence phase.

## Open questions

None identified.
