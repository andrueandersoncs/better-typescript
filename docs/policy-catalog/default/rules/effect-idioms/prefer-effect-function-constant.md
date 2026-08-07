# prefer-effect-function-constant

## Classification

Reported default policy; Effect function idiom; file-local semantic detection.

## Active wiring

Listed in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectFunctionConstant.ts
- packages/matchers/src/builtins/preferEffectFunctionConstant.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Replace handwritten stable zero-argument thunks with Effect Function.constant.

## Detection boundary

Finds zero-parameter, non-async, non-generator, non-generic arrows or function expressions whose concise body or sole return is a primitive literal or an identifier bound by one earlier same-file simple const declaration. It also examines callback arrows.

## Exemptions and non-findings

Fresh arrays/objects, calls, new expressions, property reads, mutable/imported/later/destructured bindings, parameterized or generic functions, async/generator functions, and multi-statement or branching bodies are not findings.

## Guidance

Use Function.constant(expression), which captures the stable value once.

## Dependencies

TypeScript symbol/declaration resolution, declaration order, const-list checks, and body normalization.

## Tests and examples

- tests/preferEffectFunctionConstant.test.ts
- tests/fixtures/prefer-effect-function-constant/
- packages/guidance/examples/prefer-effect-function-constant/

## Skill migration

- Proposed skill: lint-rule-prefer-effect-function-constant
- Scope: local file
- Required semantic context: symbol declarations, binding stability, and source order
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: expose preferEffectFunctionConstantMatcher facts

## Open questions

None identified.
