# no-function-keyword

## Classification

Reported default policy; function declaration style; file-local semantic detection.

## Active wiring

Listed in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noFunctionKeyword.ts
- packages/matchers/src/builtins/noFunctionKeyword.ts

## Intent

Prefer const arrow functions while retaining function syntax where JavaScript semantics require it.

## Detection boundary

Examines function declarations and function expressions. Non-generator function expressions always report. A non-generator function declaration with a body reports unless its symbol has another bodyless function-declaration sibling, indicating overload signatures. The target is the function keyword token.

## Exemptions and non-findings

Generator declarations/expressions, overloaded function implementations, arrow functions, and class methods are not findings. Bodyless declarations are not directly reported.

## Guidance

Use a const arrow; keep declarations for overloads and function* for generators.

## Dependencies

TypeScript checker for same-symbol overload declarations, generator/body inspection, and keyword-token selection.

## Tests and examples

- tests/noFunctionKeyword.test.ts
- tests/fixtures/no-function-keyword/
- packages/guidance/examples/no-function-keyword/

## Skill migration

- Proposed skill: lint-rule-no-function-keyword
- Scope: local file
- Required semantic context: function kind, generator token, body, and symbol overload siblings
- Runner phase/fleet: semantic detection / control-flow
- Deterministic candidate generation: reuse noFunctionKeywordMatcher

## Open questions

None identified.
