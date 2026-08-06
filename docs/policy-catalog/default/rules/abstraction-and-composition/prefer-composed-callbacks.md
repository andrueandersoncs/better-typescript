# prefer-composed-callbacks

## Classification

Reported default policy; callback composition; file-local semantic detection.

## Active wiring

Listed in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferComposedCallbacks.ts
- packages/matchers/src/builtins/preferComposedCallbacks.ts
- packages/matchers/src/sources/sources.ts

## Intent

Replace inline expression callbacks that thread their parameter through calls with flow/pipe or a named adapter.

## Detection boundary

Finds expression-bodied arrow functions directly used as call arguments, with exactly one identifier parameter, when some call in the body has an argument that references the parameter. A direct single call f(parameter) is deliberately excluded as simple forwarding; captured extra values do not prevent a finding.

## Exemptions and non-findings

Named callbacks, block-bodied callbacks, object transformations without a parameter-bearing call, direct unary forwarding, non-call-argument arrows, and callbacks with other arity are not findings.

## Guidance

Use flow/pipe for composition or name the adapter in the nearest scope and pass it by reference.

## Dependencies

TypeScript symbol identity for the parameter and AST-fold reference/call analysis.

## Tests and examples

- tests/preferComposedCallbacks.test.ts
- tests/fixtures/prefer-composed-callbacks/
- packages/guidance/examples/prefer-composed-callbacks/

## Skill migration

- Proposed skill: lint-rule-prefer-composed-callbacks
- Scope: local file
- Required semantic context: parameter symbol references and nested call structure
- Runner phase/fleet: composition detection / concepts-composition
- Deterministic candidate generation: reuse preferComposedCallbacksMatcher

## Open questions

None identified.
