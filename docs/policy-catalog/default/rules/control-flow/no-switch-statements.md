# no-switch-statements

## Classification

Reported default policy; branching control flow; file-local syntactic detection.

## Active wiring

Listed in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noSwitchStatements.ts
- packages/matchers/src/builtins/noSwitchStatements.ts

## Intent

Use exhaustive expression-oriented pattern matching instead of switch statements.

## Detection boundary

Reports every SwitchStatement, including nested switches, regardless of discriminant type or exhaustiveness.

## Exemptions and non-findings

No switch statement is exempt. Effect Match, lookup tables, conditionals, and if/else syntax are not findings.

## Guidance

Use Effect Match and prefer Match.exhaustive.

## Dependencies

TypeScript SwitchStatement AST only.

## Tests and examples

- tests/noSwitchStatements.test.ts
- tests/fixtures/no-switch-statements/
- packages/guidance/examples/no-switch-statements/

## Skill migration

- Proposed skill: lint-rule-no-switch-statements
- Scope: local file
- Required semantic context: switch AST; discriminant type helps remediation
- Runner phase/fleet: syntax detection / control-flow
- Deterministic candidate generation: reuse noSwitchStatementsMatcher

## Open questions

None identified.
