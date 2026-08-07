# prefer-effect-schema-constructor

## Classification

Reported default policy; Effect schema modeling; file-local syntactic detection.

## Active wiring

Listed in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectSchemaConstructor.ts
- packages/matchers/src/builtins/preferEffectSchemaConstructor.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Stop functions from constructing meaningful records as raw returned object literals.

## Detection boundary

Finds non-empty object literals that are direct returned-expression leaves of return statements or arrow bodies. It descends through transparent wrappers, both ternary arms, and the right side of ??, ||, and &&. A literal string _tag is retained for tagged guidance.

## Exemptions and non-findings

Empty objects, object literals passed to other calls, local object assignments, nested object members, and objects already produced through constructors are not findings.

## Guidance

Reuse a matching schema and call schema.make. Otherwise distinguish reusable boundary data, internal workflow state, typed errors, and procedural seams before introducing a model.

## Dependencies

TypeScript AST, returned-expression classification, and transparent-wrapper traversal; no checker.

## Tests and examples

- tests/preferEffectSchemaConstructor.test.ts
- tests/fixtures/prefer-effect-schema-constructor/
- packages/guidance/examples/prefer-effect-schema-constructor/

Fixtures cover tagged and untagged returns, concise arrows, ternaries, nullish fallback, and non-returned objects.

## Skill migration

- Proposed skill: lint-rule-prefer-effect-schema-constructor
- Scope: local file
- Required semantic context: returned-expression AST and optional literal tag
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse branchExpressions plus preferEffectSchemaConstructorMatcher

## Open questions

None identified.
