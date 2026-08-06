# prefer-function-flip

## Classification

Reported default policy; data-last composition; file-local semantic detection.

## Active wiring

Listed in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferFunctionFlip.ts
- packages/matchers/src/builtins/preferFunctionFlip.ts
- packages/matchers/src/support/tsNode.ts
- packages/matchers/src/sources/sources.ts

## Intent

Replace a unary lambda that only reverses the useful partial-application order of a curried function.

## Detection boundary

Finds concise arrows with one required identifier parameter shaped as outer(inner(parameter))(fixed), where both calls are unary/non-spread, the parameter occurs exactly once, does not occur in either callee or the fixed outer argument, and the inner callee can be detached without losing this.

## Exemptions and non-findings

Block bodies, complex parameters, multi-argument calls, repeated/captured parameter uses, already data-last or Function.flip forms, and instance methods requiring this are not findings.

## Guidance

Reorder the curried function data-last and pass its partial directly, or use Function.flip.

## Dependencies

TypeScript symbol/type analysis for this binding, AST reference counts, unary-call parsing, and concise-body unwrapping.

## Tests and examples

- tests/preferFunctionFlip.test.ts
- tests/fixtures/prefer-function-flip/
- packages/guidance/examples/prefer-function-flip/

## Skill migration

- Proposed skill: lint-rule-prefer-function-flip
- Scope: local file
- Required semantic context: curried call shape, parameter references, and this-binding safety
- Runner phase/fleet: composition detection / concepts-composition
- Deterministic candidate generation: reuse preferFunctionFlipMatcher

## Open questions

None identified.
