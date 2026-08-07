# prefer-direct-yield

## Classification

Reported default policy; Effect generator simplification; file-local semantic detection.

## Active wiring

Listed in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferDirectYield.ts
- packages/matchers/src/builtins/preferDirectYield.ts
- packages/matchers/src/sources/sources.ts
- packages/matchers/src/support/tsSignature.ts

## Intent

Remove a temporary Effect binding used only as the operand of one yield*.

## Detection boundary

Finds const identifier declarations with an initializer inside a generator passed to a symbol-resolved Effect.gen or Effect.fn wrapper when that binding has exactly one same-symbol reference in the generator and that reference is directly yield* identifier. The ancestor walk stops at nested non-generator functions.

## Exemptions and non-findings

Already-direct yield*, multiple uses, non-const or missing initializers, outer-scope bindings, nested call-argument extraction, plain generators, and unrelated/local gen/fn calls are not findings.

## Guidance

Yield the initializer directly, retaining separate consts for nested call arguments when needed by no-nested-calls.

## Dependencies

TypeScript checker and symbol identity, Effect package provenance, AST folding, and generator ancestry.

## Tests and examples

- tests/preferDirectYield.test.ts
- tests/fixtures/prefer-direct-yield/
- packages/guidance/examples/prefer-direct-yield/

## Skill migration

- Proposed skill: lint-rule-prefer-direct-yield
- Scope: local file
- Required semantic context: resolved Effect wrapper, binding references, and yield* use
- Runner phase/fleet: simplification detection / concepts-composition
- Deterministic candidate generation: reuse preferDirectYieldMatcher reference analysis

## Open questions

None identified.
