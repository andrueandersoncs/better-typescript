# require-conversion-direction-consistency

## Classification
Reported default semantic-naming policy.

## Active wiring
`semanticNamingPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/requireConversionDirectionConsistency.ts`; `packages/matchers/src/builtins/requireConversionDirectionConsistency.ts`; `packages/matchers/src/support/callableSemantics.ts`.

## Intent
Make conversion names accurately state source and result concepts.

## Detection boundary
Checks non-boolean callable definitions with explicit `from`/`to` direction or a recognized conversion operation (`as/decode/deserialize/encode/format/parse/serialize/stringify/to/transform`). A directional name reports only when both claimed axes explicitly disagree with parameter and return concepts. Without a direction, `decode/parse` compare the object to the result; `encode/format/serialize/stringify` compare it to the source.

## Exemptions and non-findings
Skips unknown concepts, absent explicit disagreement, non-conversion command relations such as `addUserToGroup`, and matching source/result claims.

## Guidance
Rename the mismatched source/result phrase or change the parameter/return concept.

## Dependencies
TypeScript checker and shared callable name, source-concept, result-concept, and conversion-role inference.

## Tests and examples
`tests/requireConversionDirectionConsistency.test.ts`; `tests/fixtures/require-conversion-direction-consistency/`; `packages/guidance/examples/require-conversion-direction-consistency/`.

## Skill migration
Proposed `lint-rule-require-conversion-direction-consistency`; local callable scope; requires parsed direction plus resolved source/result concepts; semantic-naming fleet, candidate phase; deterministic candidate generation can reuse the matcher.

## Open questions
None identified.
