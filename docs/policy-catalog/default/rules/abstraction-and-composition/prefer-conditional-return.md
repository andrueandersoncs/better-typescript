# prefer-conditional-return

## Classification

Reported default policy; expression simplification; file-local syntactic detection.

## Active wiring

Listed in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferConditionalReturn.ts
- packages/matchers/src/builtins/preferConditionalReturn.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Replace if branches that only choose between returned values with one conditional return expression.

## Detection boundary

Within each block, finds an if whose then branch is a single value return and whose else branch, or immediately following statement when else is absent, is also a single value return. Each returned expression must be one line, at most 100 characters, contain no yield, and not already be a conditional expression. A leading ! condition is inverted so the suggestion avoids unnecessary negation.

## Exemptions and non-findings

Else-if chains, non-return fallback statements, multi-statement branches, bare returns, long/multiline expressions, yielded expressions, and a branch already using a ternary are not findings.

## Guidance

Return the generated conditional expression directly.

## Dependencies

Block sibling order, single-statement block unwrapping, expression length/text, and recursive yield detection.

## Tests and examples

- tests/preferConditionalReturn.test.ts
- tests/fixtures/prefer-conditional-return/
- packages/guidance/examples/prefer-conditional-return/

## Skill migration

- Proposed skill: lint-rule-prefer-conditional-return
- Scope: local file
- Required semantic context: if/return AST, adjacent statement, expression text
- Runner phase/fleet: simplification detection / concepts-composition
- Deterministic candidate generation: reuse preferConditionalReturnMatcher and its generated returnText fact

## Open questions

None identified.
