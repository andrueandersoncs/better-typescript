# prefer-effect-schema-constructor

## Classification

Reported default policy; Effect schema modeling; declaration and return analysis.

## Active wiring

Listed in `effectSchemaPolicies`, then `defaultWiring`; self-hosted on all product source files.

## Implementation sources

- `packages/matchers/src/builtins/preferEffectSchemaConstructor.ts`
- `packages/guidance/src/preset/defaultWiring.ts`

## Intent

Stop meaningful records from being declared or returned as raw object literals.

## Detection boundary

Reports non-empty data object literals in function-local variable declarations, whether or not the binding is returned, and first-party object literals returned directly. Conditional declaration branches and standard-library return containers are analyzed.

## Exemptions and non-findings

Empty objects, behavior-bearing object implementations, constructor-produced values, and direct contextual or nullable third-party adapter returns are quiet.

## Guidance

Reuse a matching schema and call `schema.make`; introduce a schema only for independently meaningful data.

## Dependencies

TypeScript checker, declaration analysis, contextual return signatures, and Effect Schema provenance.

## Tests and examples

- `tests/preferEffectSchemaConstructor.test.ts`
- `tests/fixtures/prefer-effect-schema-constructor/`
- `packages/guidance/examples/prefer-effect-schema-constructor/`

## Skill migration

- Proposed skill: lint-rule-prefer-effect-schema-constructor
- Scope: local file
- Required semantic context: variable declarations, resolved return contracts, and Schema constructors
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse `preferEffectSchemaConstructorMatcher` with runner-supplied source files

## Open questions

None identified.
