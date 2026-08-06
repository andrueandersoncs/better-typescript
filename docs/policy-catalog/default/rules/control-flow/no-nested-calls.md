# no-nested-calls

## Classification

Reported default policy; expression sequencing; file-local semantic detection and aggregate-advice input.

## Active wiring

Last in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**. defaultSpecificAdvice also combines its findings with prefer-curried-data-last-functions for pipeline-hostile advice.

## Implementation sources

- packages/guidance/src/policies/noNestedCalls.ts
- packages/matchers/src/builtins/noNestedCalls.ts
- packages/matchers/src/support/tsSignature.ts
- packages/matchers/src/support/tsType.ts

## Intent

Expose evaluation order when one call result is computed inside another call's argument flow.

## Detection boundary

For call and new expressions, consumingCall traces whether the result flows into an argument of an enclosing call/new through supported carriers such as arithmetic, array/object literals, and assertions. It reports the inner call with inner/consumer callee labels unless the inner result type has a call signature. The first argument of an identifier-spelled pipe call is also exempt.

## Exemptions and non-findings

Currying/partial calls that return callable values, a call used as the callee or receiver, calls bound before consumption, simple arguments, and pipe(inner(), stage) data position are not findings. Other pipe arguments and non-callable new expressions can report.

## Guidance

Bind the inner result as a const or yield* step, or restructure data-last through pipe; keep function-producing calls inline.

## Dependencies

TypeScript checker for callable result types, consuming-call carrier traversal, call/new argument extraction, and callee labeling.

## Tests and examples

- tests/noNestedCalls.test.ts
- tests/fixtures/no-nested-calls/
- packages/guidance/examples/no-nested-calls/

Fixtures and three example pairs cover direct/deep nesting, carrier expressions, call/new combinations, currying, receivers, and pipe.

## Skill migration

- Proposed skill: lint-rule-no-nested-calls
- Scope: local file
- Required semantic context: consuming-call graph, result callability, and callee labels
- Runner phase/fleet: semantic detection / control-flow, before pipeline-hostile aggregation
- Deterministic candidate generation: preserve consumingCall and noNestedCallsMatcher; emit inner/consumer facts

## Open questions

None identified.
