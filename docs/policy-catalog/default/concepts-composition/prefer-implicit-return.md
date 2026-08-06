# prefer-implicit-return

## Classification

Reported default policy; expression simplification; file-local syntactic detection.

## Active wiring

Listed in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferImplicitReturn.ts
- packages/matchers/src/builtins/preferImplicitReturn.ts

## Intent

Use an expression-bodied arrow when a block only returns one value.

## Detection boundary

Finds arrow functions whose block body has exactly one statement and that statement is a return with an expression. The finding targets the body block.

## Exemptions and non-findings

Already concise arrows, multiple statements, expression statements, bare return, empty blocks, and function declarations are not findings.

## Guidance

Remove return and braces; parenthesize returned object literals.

## Dependencies

TypeScript arrow/block/return AST only.

## Tests and examples

- tests/preferImplicitReturn.test.ts
- tests/fixtures/prefer-implicit-return/
- packages/guidance/examples/prefer-implicit-return/

## Skill migration

- Proposed skill: lint-rule-prefer-implicit-return
- Scope: local file
- Required semantic context: arrow body statement count and return expression
- Runner phase/fleet: simplification detection / concepts-composition
- Deterministic candidate generation: reuse preferImplicitReturnMatcher

## Open questions

None identified.
