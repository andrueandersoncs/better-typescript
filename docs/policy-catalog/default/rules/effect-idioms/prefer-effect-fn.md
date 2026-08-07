# prefer-effect-fn

## Classification

Reported default policy; Effect function idiom; file-local semantic detection.

## Active wiring

Listed in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectFn.ts
- packages/matchers/src/builtins/preferEffectFn.ts
- packages/matchers/src/support/tsSignature.ts

## Intent

Use Effect.fn for parameterized Effect-returning functions that merely wrap Effect.gen, gaining the standard span and removing the wrapper.

## Detection boundary

Finds variable-declared arrow/function initializers with at least one parameter, an inferred return type whose symbol is Effect.Effect, and a concise or single-return body whose returned call resolves to Effect.gen. It records the variable name and Effect.gen self binding, including generator this type.

## Exemptions and non-findings

Zero-argument thunks, function declarations, non-Effect returns, multi-statement wrapper bodies, non-Effect lookalikes, and functions already using Effect.fn are not findings.

## Guidance

Rewrite as a named Effect.fn generator. Preserve self and explicit this binding with the self-aware overload.

## Dependencies

TypeScript signatures, Effect symbol provenance, function-initializer parsing, and Effect.gen argument inspection.

## Tests and examples

- tests/preferEffectFn.test.ts
- tests/fixtures/prefer-effect-fn/
- packages/guidance/examples/prefer-effect-fn/

Fixtures and two example pairs cover ordinary and self-bound conversions.

## Skill migration

- Proposed skill: lint-rule-prefer-effect-fn
- Scope: local file
- Required semantic context: inferred return signature, Effect provenance, self/this syntax
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: expose preferEffectFnMatcher facts and source spans

## Open questions

None identified.
