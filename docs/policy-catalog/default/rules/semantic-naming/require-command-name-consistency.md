# require-command-name-consistency

## Classification
Reported default semantic-naming policy.

## Active wiring
`semanticNamingPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/requireCommandNameConsistency.ts`; `packages/matchers/src/builtins/requireCommandNameConsistency.ts`; `packages/matchers/src/support/callableSemantics.ts`.

## Intent
Align command names with side-effect/void behavior and prevent commands from masquerading as accessors or results.

## Detection boundary
Checks callable definitions. Reports `publish/save/send/write` without command-role evidence, and void command-role callables lacking command/predicate language but carrying accessor, projection, result-bearing, or bare-result naming evidence.

## Exemptions and non-findings
Allows true void/effect commands with command vocabulary, predicates, pure transforms without command claims, value-bearing Effects, ordinary nouns, and neutral callback/handler names.

## Guidance
Rename false commands away from command verbs or implement a real command; rename hidden commands with `save/write/send/publish/set/update/remove/delete` language.

## Dependencies
TypeScript checker and shared callable command/projection/result/name semantics.

## Tests and examples
`tests/requireCommandNameConsistency.test.ts`; `tests/fixtures/require-command-name-consistency/`; `packages/guidance/examples/require-command-name-consistency/`.

## Skill migration
Proposed `lint-rule-require-command-name-consistency`; local callable scope; requires parsed operation/result and body/return-derived command evidence; semantic-naming fleet, candidate phase; deterministic candidate generation can reuse the matcher.

## Open questions
None identified.
