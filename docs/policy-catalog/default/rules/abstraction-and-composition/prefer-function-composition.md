# prefer-function-composition

## Classification

Reported default policy; function composition; file-local semantic detection.

## Active wiring

Listed in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferFunctionComposition.ts
- packages/matchers/src/builtins/preferFunctionComposition.ts
- packages/matchers/src/support/unaryAdapter.ts
- packages/matchers/src/sources/sources.ts

## Intent

Replace manually threaded locals and property-projecting partial adapters with explicit function composition.

## Detection boundary

Block findings require an arrow body with exactly two statements: one single const binding with a non-function initializer, then a return whose expression contains exactly one reference to that binding and forms a nontrivial unary-call or pipe tower over it. Adapter findings require a non-type-predicate unary adapter of the form parameter.property passed to a one-argument partial call, with an explicit parameter type for the Struct.get suggestion.

## Exemptions and non-findings

Identity returns, function-valued bindings, multiple declarations/references/statements, control flow, multi-argument calls, object embedding, optional property access, already composed expressions, type predicates, and untyped property adapters are not findings.

## Guidance

Use pipe, flow, Function.compose, or flow(Struct.get<Type>(key), partial); do not replace the local with nested calls.

## Dependencies

AST folds, unaryAdapter, transparent-expression handling, type-predicate signatures, explicit type text, and pipe-tower recognition.

## Tests and examples

- tests/preferFunctionComposition.test.ts
- tests/fixtures/prefer-function-composition/
- packages/guidance/examples/prefer-function-composition/

## Skill migration

- Proposed skill: lint-rule-prefer-function-composition
- Scope: local file
- Required semantic context: binding reference counts, unary call tower, predicate signature, and adapter type text
- Runner phase/fleet: composition detection / concepts-composition
- Deterministic candidate generation: reuse preferFunctionCompositionMatcher with block/adapter facts

## Open questions

None identified.
