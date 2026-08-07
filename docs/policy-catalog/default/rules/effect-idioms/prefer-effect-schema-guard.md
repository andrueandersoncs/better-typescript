# prefer-effect-schema-guard

## Classification

Reported default policy; Effect schema idiom; file-local syntactic detection.

## Active wiring

Listed first in effectIdiomPolicies, then defaultWiring. Self-hosting applies defaultWiring to packages/*/src/** through standardSelfHostWiring.

## Implementation sources

- packages/guidance/src/policies/preferEffectSchemaGuard.ts
- packages/matchers/src/builtins/preferEffectSchemaGuard.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Replace ad hoc property-presence type guards with an Effect Schema model and Schema.is.

## Detection boundary

Within an if condition, recursively finds binary expressions whose operator is in and whose left operand is a string literal or no-substitution template literal. Each qualifying nested check produces a finding containing the key and right-hand expression text.

## Exemptions and non-findings

Dynamic keys, numeric keys, instanceof, ordinary property tests, Schema.is calls, and in expressions outside if conditions are not findings.

## Guidance

Define an Effect Schema and replace the property test with Schema.is($schema)(value).

## Dependencies

TypeScript AST traversal and transparent-expression unwrapping. No type checker or cross-file index is used.

## Tests and examples

- tests/preferEffectSchemaGuard.test.ts
- tests/fixtures/prefer-effect-schema-guard/
- packages/guidance/examples/prefer-effect-schema-guard/

Fixtures cover single and compound conditions, template keys, wrapped checks, and the dynamic/non-string exemptions.

## Skill migration

- Proposed skill: lint-rule-prefer-effect-schema-guard
- Scope: local file
- Required semantic context: parsed if-condition AST only
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse or expose preferEffectSchemaGuardMatcher to emit key-in-object sites

## Open questions

None identified.
