# prefer-curried-data-last-functions

## Classification
Silent default dispatch/collections evidence policy.

## Active wiring
`dispatchAndCollectionPolicies` -> `defaultWiring`; enabled for `**/*`; authored with `makeBuiltinPolicy({ reported: false, ... })`, then consumed by `pipeline-hostile`.

## Implementation sources
`packages/guidance/src/policies/preferCurriedDataLastFunctions.ts`; `packages/matchers/src/builtins/preferCurriedDataLastFunctions.ts`; `packages/matchers/src/builtins/preferCurriedDataLastFunctionsData.ts`; `packages/matchers/src/support/referenceKey.ts`; `packages/matchers/src/support/tsSignature.ts`; `packages/matchers/src/support/tsType.ts`.

## Intent
Identify authored functions whose multi-parameter shape prevents data-last pipeline composition.

## Detection boundary
Builds a workspace symbol-use index, then reports function declarations, expressions, arrows, and methods with rest parameters or more than one runtime parameter (`this` excluded), unless already expressed as a one-parameter arrow returning a function. Named declarations and variable initializers are tracked across direct calls and references.

## Exemptions and non-findings
Allows zero/unary functions, curried concise arrows, contextually typed function initializers (such as inline reducers), and named multi-parameter functions used only as callbacks at external callable boundaries. Direct calls or other references make a tracked function reportable.

## Guidance
Curry runtime parameters so configuration comes first and the primary data value last.

## Dependencies
Whole-program AST fold, resolved symbols/reference keys, contextual/call parameter types, external signature provenance, call signatures, and usage classification.

## Tests and examples
`tests/preferCurriedDataLastFunctions.test.ts`; `tests/fixtures/prefer-curried-data-last-functions/`; `packages/guidance/examples/prefer-curried-data-last-functions/`.

## Skill migration
Proposed `lint-evidence-prefer-curried-data-last-functions` as shared runner infrastructure, not a user-facing rule skill; workspace cross-file scope; requires symbol/reference usage indexing plus contextual/external callback signatures; pipeline evidence phase; deterministic candidate generation should reuse the two-pass tracker.

## Open questions
Whether the migrated skill should remain evidence-only or become user-visible is not specified.
