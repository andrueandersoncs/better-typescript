# prefer-direct-boolean-return

## Classification

Reported default policy; boolean simplification; file-local syntactic detection.

## Active wiring

Listed in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferDirectBooleanReturn.ts
- packages/matchers/src/builtins/preferDirectBooleanReturn.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Return boolean conditions and short-circuit expressions directly instead of encoding them with literal branches.

## Detection boundary

Emits literal-branch for an if whose single then return is true/false, and for ternaries with opposite boolean-literal arms. Emits and-false for ternaries with one false arm and one non-literal arm, or an if with no else whose final then expression returns a non-literal followed immediately by return false. Parentheses are unwrapped.

## Exemptions and non-findings

Same-literal ternary arms, two non-literal arms, bare returns, multi-statement then blocks where the relevant return is not final, and false-following shapes whose then return is itself a boolean literal are not that short-circuit finding. Some allowed fixtures intentionally still carry another rule marker.

## Guidance

Use the condition or its negation for literal branches; use && for a value-or-false choice and name a negated condition before combining when needed.

## Dependencies

If/block/conditional AST, return-expression unwrapping, and sibling order.

## Tests and examples

- tests/preferDirectBooleanReturn.test.ts
- tests/fixtures/prefer-direct-boolean-return/
- packages/guidance/examples/prefer-direct-boolean-return/

## Skill migration

- Proposed skill: lint-rule-prefer-direct-boolean-return
- Scope: local file
- Required semantic context: boolean-literal branch structure and adjacent returns
- Runner phase/fleet: simplification detection / concepts-composition
- Deterministic candidate generation: reuse preferDirectBooleanReturnMatcher and its two fact kinds

## Open questions

None identified.
