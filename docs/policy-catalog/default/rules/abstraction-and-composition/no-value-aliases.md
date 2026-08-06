# no-value-aliases

## Classification

Reported default policy; abstraction simplification; file-local syntactic detection.

## Active wiring

Listed in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noValueAliases.ts
- packages/matchers/src/builtins/noValueAliases.ts

## Intent

Remove const declarations that add only another name for an existing value.

## Detection boundary

Finds const declarations with an identifier binding whose initializer, after unwrapping parentheses, as/satisfies/type assertions, and non-null assertions, is an identifier or a non-optional dotted property-access chain.

## Exemptions and non-findings

let/var, destructuring, calls, literals, constructed values, conditional expressions, optional chains, computed access, and property access rooted in a temporary expression are not findings. Import renaming and export aliases are outside this matcher.

## Guidance

Use the referenced value directly; introduce a new name only with behavior, constructed data, distinct semantics, or deliberate one-time evaluation.

## Dependencies

TypeScript variable-declaration AST and transparent alias-wrapper removal; no checker.

## Tests and examples

- tests/noValueAliases.test.ts
- tests/fixtures/no-value-aliases/
- packages/guidance/examples/no-value-aliases/

## Skill migration

- Proposed skill: lint-rule-no-value-aliases
- Scope: local file
- Required semantic context: declaration kind and initializer expression shape
- Runner phase/fleet: simplification detection / concepts-composition
- Deterministic candidate generation: reuse noValueAliasesMatcher

## Open questions

None identified.
