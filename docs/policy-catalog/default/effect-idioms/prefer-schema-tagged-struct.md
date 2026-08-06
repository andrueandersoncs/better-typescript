# prefer-schema-tagged-struct

## Classification

Reported default policy; Effect schema modeling; file-local semantic detection.

## Active wiring

Listed in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferSchemaTaggedStruct.ts
- packages/matchers/src/builtins/preferSchemaTaggedStruct.ts
- packages/matchers/src/support/taggedClassPortability.ts

## Intent

Use Schema.TaggedStruct for Data.TaggedClass values whose entire structure is portable across a reusable boundary.

## Detection boundary

Finds classes whose heritage resolves specifically to Effect Data.TaggedClass and whose fields type argument is absent, empty, or recursively wire-safe. Wire-safe values include primitives, defined optional unions, arrays/tuples, and non-class structural objects without call/construct signatures; recursion is bounded.

## Exemptions and non-findings

Effect/Stream/function/live-handle fields, any/unknown/undefined/void/symbol/bigint/nonprimitive fields, unresolved unsafe structures, class-valued fields, local TaggedClass lookalikes, and existing Schema.TaggedStruct values are not findings.

## Guidance

Use Schema.TaggedStruct plus a same-named decoded interface for boundary data; retain Data.TaggedClass for process-bound values and Data.TaggedEnum for internal state.

## Dependencies

TypeScript checker, exact Effect module provenance, recursive wire-portability analysis, and named target selection.

## Tests and examples

- tests/preferSchemaTaggedStruct.test.ts
- tests/fixtures/prefer-schema-tagged-struct/
- packages/guidance/examples/prefer-schema-tagged-struct/

## Skill migration

- Proposed skill: lint-rule-prefer-schema-tagged-struct
- Scope: local file
- Required semantic context: heritage symbol and recursively resolved field types
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: preserve dataTaggedClassHeritage and typeIsWireSafe

## Open questions

None identified.
