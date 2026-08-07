# prefer-effect-schema-is

## Classification

Reported default policy; Effect schema idiom; file-local semantic detection.

## Active wiring

Listed in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectSchemaIs.ts
- packages/matchers/src/builtins/preferEffectSchemaIs.ts
- packages/matchers/src/support/tsNode.ts

## Intent

Replace direct first-party discriminant comparisons with schema-backed membership checks.

## Detection boundary

Finds strict === or !== comparisons between a ._tag property and a string-like literal, in either operand order. The checked value must have a type whose every union constituent resolves to a first-party symbol. Facts preserve value, operator, tag, and negation.

## Exemptions and non-findings

Loose equality, non-string tags, comparisons between two tags, non-_tag properties, anonymous/external structural types, and Schema.is calls are not findings.

## Guidance

Use Schema.is for the Effect Schema class representing the tag; negate the check for !==.

## Dependencies

TypeScript checker, first-party symbol classification, and expression unwrapping.

## Tests and examples

- tests/preferEffectSchemaIs.test.ts
- tests/fixtures/prefer-effect-schema-is/
- packages/guidance/examples/prefer-effect-schema-is/

Fixtures cover operand order, nested access, unions, template tags, external tags, and non-strict comparisons.

## Skill migration

- Proposed skill: lint-rule-prefer-effect-schema-is
- Scope: local file
- Required semantic context: resolved receiver type and first-party provenance
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: expose preferEffectSchemaIsMatcher over the project Program

## Open questions

None identified.
