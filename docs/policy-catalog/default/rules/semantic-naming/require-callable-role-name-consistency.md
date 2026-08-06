# require-callable-role-name-consistency

## Classification
Reported default semantic-naming policy.

## Active wiring
`semanticNamingPolicies` -> `defaultWiring`; enabled for `**/*` by `defaultConfig`.

## Implementation sources
`packages/guidance/src/policies/requireCallableRoleNameConsistency.ts`; `packages/matchers/src/builtins/requireCallableRoleNameConsistency.ts`; `packages/matchers/src/support/callableSemantics.ts`.

## Intent
Enforce the contracts claimed by callable role nouns.

## Detection boundary
Checks multiword names whose result noun is `accessor/callback/comparator/factory/function/handler/mapper/predicate/reducer`. Validates respectively projection evidence; callable return; numeric return; construction; callable return; void/Effect return; input plus non-void result; boolean result; or two inputs with accumulator-compatible result.

## Exemptions and non-findings
Allows matching contracts, ordinary nouns without an exact role claim, and words merely containing role substrings.

## Guidance
Remove the role noun or change signature/body to satisfy the reported role expectation.

## Dependencies
TypeScript checker, call signatures/assignability, and shared callable projection, role, construction, execution, and result-shape inference.

## Tests and examples
`tests/requireCallableRoleNameConsistency.test.ts`; `tests/fixtures/require-callable-role-name-consistency/`; `packages/guidance/examples/require-callable-role-name-consistency/`.

## Skill migration
Proposed `lint-rule-require-callable-role-name-consistency`; local callable scope; requires parsed role noun and resolved signature/body semantics; semantic-naming fleet, candidate phase; deterministic candidate generation can reuse the matcher.

## Open questions
None identified.
