# prefer-effect-schema-constructor

## Classification

Reported default policy; Effect schema modeling; symbol-aware return analysis.

## Active wiring

Listed in `effectSchemaPolicies`, then `defaultWiring`; self-hosted on all product source files.

## Implementation sources

- `packages/matchers/src/builtins/preferEffectSchemaConstructor.ts`
- `packages/matchers/src/builtins/preferEffectSchemaConstructorForeignReturn.ts`
- `packages/guidance/src/preset/defaultWiring.ts`

## Intent

Stop first-party functions from escaping meaningful records as raw object literals.

## Detection boundary

Reports non-empty object literals returned directly or through a same-symbol local binding. Transparent returns, nested control flow, conditional aliases, and standard-library return containers are analyzed.

## Exemptions and non-findings

Empty objects, shadowed bindings, nested functions, constructor-produced values, and contextual or nullable third-party adapter contracts are quiet.

## Guidance

Reuse a matching schema and call `schema.make`; introduce a schema only for independently meaningful data.

## Dependencies

TypeScript checker, symbol-linked return-flow analysis, contextual signatures, and Effect Schema provenance.

## Tests and examples

- `tests/preferEffectSchemaConstructor.test.ts`
- `tests/fixtures/prefer-effect-schema-constructor/`
- `packages/guidance/examples/prefer-effect-schema-constructor/`

## Skill migration

- Proposed skill: lint-rule-prefer-effect-schema-constructor
- Scope: local file
- Required semantic context: resolved return contracts, local binding symbols, and Schema constructors
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse `preferEffectSchemaConstructorMatcher` with runner-supplied source files

## Open questions

None identified.
