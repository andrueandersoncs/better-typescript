# prefer-option-match

## Classification
Reported default dispatch/collections policy.

## Active wiring
`dispatchAndCollectionPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/preferOptionMatch.ts`; `packages/matchers/src/builtins/preferOptionMatch.ts`; `packages/matchers/src/support/tsNode.ts`.

## Intent
Express Option branching with `Option.match` rather than guard plus representation access.

## Detection boundary
Checks ternaries whose condition is syntactically `Option.isSome(identifier)` or `Option.isNone(identifier)` through transparent wrappers. Reports only when the corresponding Some branch reads `identifier.value` somewhere below it.

## Exemptions and non-findings
Allows standalone/`if` guards, ternaries returning the Option itself, branch logic without `.value`, non-identifier arguments, aliases or qualified objects not textually named `Option`, and guards other than `isSome/isNone`.

## Guidance
Use `Option.match` with `onNone` and `onSome` callbacks.

## Dependencies
TypeScript AST and transparent-expression/descendant traversal; no symbol identity check.

## Tests and examples
`tests/preferOptionMatch.test.ts`; `tests/fixtures/prefer-option-match/`; `packages/guidance/examples/prefer-option-match/`.

## Skill migration
Proposed `lint-rule-prefer-option-match`; local conditional scope; requires exact guard and branch syntax; dispatch/collections fleet, candidate phase; deterministic candidate generation can reuse the matcher.

## Open questions
Whether skill migration should preserve textual `Option` matching instead of resolving the Effect symbol is not specified.
