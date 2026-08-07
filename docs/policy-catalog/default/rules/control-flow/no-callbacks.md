# no-callbacks

## Classification

Reported default policy; Effect control flow; file-local semantic detection.

## Active wiring

First in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noCallbacks.ts
- packages/matchers/src/builtins/noCallbacks.ts
- packages/matchers/src/support/tsNode.ts
- packages/matchers/src/support/tsType.ts

## Intent

Replace callback-style APIs that accept executable continuations and return void with Effect-returning APIs.

## Detection boundary

Examines function declarations/expressions, arrows, method declarations/signatures, call signatures, and eligible function-type nodes. A finding requires a resolved signature returning void and at least one parameter whose type has a call signature; rest parameters also count when their numeric element type is callable. Standalone/type-alias/property-signature function types and non-runtime variable/property annotations are covered through transparent union/intersection/parenthesis wrappers.

## Exemptions and non-findings

Ambient declarations, functions returning a value, void functions without callable parameters, non-callable object parameters, and function-type annotations whose variable/property initializer is a runtime function are not findings.

## Guidance

Wrap third-party callbacks in Effect and design first-party APIs to return Effect from the start.

## Dependencies

TypeScript signatures and return/parameter types, call-signature detection, ambient-context detection, and function-type parent classification.

## Tests and examples

- tests/noCallbacks.test.ts
- tests/fixtures/no-callbacks/
- packages/guidance/examples/no-callbacks/

Fixtures and two example pairs cover all declaration/signature forms, rest callback types, allowed value returns, and ambient integration.

## Skill migration

- Proposed skill: lint-rule-no-callbacks
- Scope: local file
- Required semantic context: declared signature, callable parameter/element types, ambient context
- Runner phase/fleet: semantic detection / control-flow
- Deterministic candidate generation: reuse noCallbacksMatcher

## Open questions

None identified.
