# no-raw-object-types

## Classification
Reported default dispatch/collections policy with parameter and return findings.

## Active wiring
`dispatchAndCollectionPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/noRawObjectTypes.ts`; `packages/matchers/src/builtins/noRawObjectTypes.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Give function-boundary data a reusable domain identity instead of anonymous object structure.

## Detection boundary
Checks parameter annotations and explicit return annotations across functions, arrows, methods, method/call signatures, function types, and getters. Reports a top-level type literal or `object` keyword, including through parenthesized unions/intersections.

## Exemptions and non-findings
Allows named interfaces/aliases/classes, primitives, tuples, function types, inferred types, named unions, and inline object types nested inside a generic type argument such as `ReadonlyArray<{...}>`.

## Guidance
Reuse an existing domain model; introduce a named model only when it has independent meaning, and reconsider procedural parameter seams. Return models should be named for domain meaning, not `Result/Response` structure.

## Dependencies
TypeScript AST and shared return-declaration targeting.

## Tests and examples
`tests/noRawObjectTypes.test.ts`; `tests/fixtures/no-raw-object-types/`; `packages/guidance/examples/no-raw-object-types/`.

## Skill migration
Proposed `lint-rule-no-raw-object-types`; local signature scope; requires type syntax and surrounding boundary role; dispatch/collections fleet, candidate phase; deterministic candidate generation can reuse recursive raw-object syntax detection.

## Open questions
None identified.
