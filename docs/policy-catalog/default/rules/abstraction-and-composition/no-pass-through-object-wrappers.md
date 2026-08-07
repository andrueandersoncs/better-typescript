# no-pass-through-object-wrappers

## Classification

Reported default policy; abstraction simplification; file-local structural detection.

## Active wiring

Last in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noPassThroughObjectWrappers.ts
- packages/matchers/src/builtins/noPassThroughObjectWrappers.ts
- packages/matchers/src/builtins/passThroughWrappers.ts

## Intent

Delete functions that only repackage their parameters into an object for another constructor or factory.

## Detection boundary

Finds arrow, function-expression, and function-declaration bodies that are a direct invocation expression or a block whose first statement returns one. At least one invocation argument must be a non-empty object literal. Every simple, non-default, non-rest identifier parameter must be consumed exactly once, in declaration order, through direct arguments, forwarded object properties, or the invocation receiver.

## Exemptions and non-findings

Wrappers that transform values, add defaults/validation/behavior, reorder/duplicate/omit parameters, use unsupported property shapes, or do not pass a non-empty object literal are not findings.

## Guidance

Inline the constructor/factory at callers; retain a function only when it owns policy, validation, defaults, or behavior.

## Dependencies

Shared exact-forwarder analysis, invocation/body normalization, object-property forwarding, and parameter-consumption ordering.

## Tests and examples

- tests/noPassThroughObjectWrappers.test.ts
- tests/fixtures/no-pass-through-object-wrappers/
- packages/guidance/examples/no-pass-through-object-wrappers/

## Skill migration

- Proposed skill: lint-rule-no-pass-through-object-wrappers
- Scope: local file
- Required semantic context: normalized invocation, parameter flow, and object-argument structure
- Runner phase/fleet: abstraction detection / concepts-composition
- Deterministic candidate generation: preserve invocationExpressionBody and isExactForwarder

## Open questions

None identified.
