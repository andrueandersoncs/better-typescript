# no-inline-closures

## Classification

Reported default policy; function placement; file-local semantic detection.

## Active wiring

Listed in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noInlineClosures.ts
- packages/matchers/src/builtins/noInlineClosures.ts
- packages/matchers/src/support/tsSignature.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Name first-party closures while retaining concise arrows for declarations, currying, and external combinator contracts.

## Detection boundary

Examines every arrow after climbing transparent wrappers. An arrow is allowed when its effective parent is a variable declaration or another arrow, or when semantic call-signature tracing classifies it as an argument to an external package; that external allowance follows arrows nested inside forwarded handler objects. Every other arrow reports at =>.

## Exemptions and non-findings

Named const arrows, curried arrows, parenthesized/satisfies-wrapped initializers, and callbacks to Effect/other node_modules APIs are not findings. Default-lib methods and first-party function arguments are not external and therefore report, as do arrows in object properties, arrays, returns, and conditional arms.

## Guidance

Name a top-level function and pass it by reference, curry captured values, or use a generator for multi-step sequencing.

## Dependencies

Transparent-parent unwrapping plus TypeScript program/signature provenance through isExternalPackageArgument.

## Tests and examples

- tests/noInlineClosures.test.ts
- tests/fixtures/no-inline-closures/
- packages/guidance/examples/no-inline-closures/

Fixtures and two example pairs cover naming, currying, wrappers, Effect handler objects, default-lib callbacks, and first-party callbacks.

## Skill migration

- Proposed skill: lint-rule-no-inline-closures
- Scope: local file
- Required semantic context: effective parent and resolved callback target package
- Runner phase/fleet: semantic detection / control-flow
- Deterministic candidate generation: preserve isExternalPackageArgument and noInlineClosuresMatcher

## Open questions

None identified.
