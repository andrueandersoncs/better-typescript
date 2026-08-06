# prefer-effect-schema-record

## Classification

Reported default policy; Effect schema modeling; project-wide semantic detection.

## Active wiring

Listed in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectSchemaRecord.ts
- packages/matchers/src/builtins/preferEffectSchemaRecord.ts
- packages/matchers/src/sources/sources.ts
- packages/matchers/src/support/referenceKey.ts

## Intent

Model constructed named records with Effect Schema and replace constructed tuple aliases with named records unless position is intrinsic.

## Detection boundary

All tuple type aliases are reported, including readonly and parenthesized tuples. Interfaces and type-literal aliases are reported only when a project object literal is contextually constructed as that type. Construction indexing handles union candidates and generic call arguments whose contextual call result boxes the argument type. The first construction file is retained.

## Exemptions and non-findings

Object types only consumed as boundaries, external declarations, non-object aliases, runtime/schema values, and non-project source files are not findings. Tuple aliases do not receive a construction exemption.

## Guidance

Use Schema.Struct plus a same-named decoded interface; construct trusted values with Type.make and decode unknown boundaries. Keep positional tuples only when positions carry inherent meaning.

## Dependencies

Whole Program, contextual types, generic signatures, object-literal AST folds, stable symbol keys, and project-source filtering.

## Tests and examples

- tests/preferEffectSchemaRecord.test.ts
- tests/fixtures/prefer-effect-schema-record/
- packages/guidance/examples/prefer-effect-schema-record/

Fixtures cover interface/type-alias construction, unions, boxed generics, recursive pairs, boundary-only types, schema records, and tuples.

## Skill migration

- Proposed skill: lint-rule-prefer-effect-schema-record
- Scope: cross-file project
- Required semantic context: contextual object-literal types, declarations, generic signatures, and project root
- Runner phase/fleet: indexed detection / effect-idioms
- Deterministic candidate generation: preserve buildConstructionIndex and emit declaration/fact JSON before agent review

## Open questions

None identified.
