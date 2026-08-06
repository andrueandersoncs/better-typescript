# prefer-specific-operation-names

## Classification
Reported default semantic-naming policy.

## Active wiring
`semanticNamingPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/preferSpecificOperationNames.ts`; `packages/matchers/src/builtins/preferSpecificOperationNames.ts`; `packages/matchers/src/support/callableSemantics.ts`.

## Intent
Replace vague operation words with the unique stronger role demonstrated by a callable.

## Detection boundary
Checks callables using `do/execute/handle/manage/process/run`. Reports only when exactly one stronger aggregation, command, construction, conversion, lookup, or projection role exists, selects a body operation or role fallback, and can produce a distinct rename.

## Exemptions and non-findings
Skips ambiguous multi-role bodies, vague bodies without stronger evidence, already-specific names, callback/handler/listener/subscriber conventions, bare runtime entries (`bootstrap/init/main/start`), and conventional `handle<Event>` names.

## Guidance
Replace the vague word with the inferred specific operation while preserving known object/result nouns.

## Dependencies
TypeScript checker and shared callable name, operation-word, and semantic-role inference.

## Tests and examples
`tests/preferSpecificOperationNames.test.ts`; `tests/fixtures/prefer-specific-operation-names/`; `packages/guidance/examples/prefer-specific-operation-names/`.

## Skill migration
Proposed `lint-rule-prefer-specific-operation-names`; local callable scope; requires parsed name and unique body-derived role/operation evidence; semantic-naming fleet, candidate phase; deterministic candidate generation can reuse the matcher and its rename calculation.

## Open questions
None identified.
