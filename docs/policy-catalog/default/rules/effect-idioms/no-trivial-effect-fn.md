# no-trivial-effect-fn

## Classification

Reported default policy; Effect workflow ownership; symbol-aware function detection.

## Active wiring

Listed in `effectFunctionPolicies`, then `defaultWiring`; self-hosted on all product source files.

## Implementation sources

- `packages/matchers/src/builtins/noTrivialEffectFn.ts`
- `packages/matchers/src/builtins/isExactForwarder.ts`
- `packages/matchers/src/builtins/contextServiceAt.ts`
- `packages/matchers/src/builtins/contextServiceDeclaration.ts`
- `packages/guidance/src/preset/defaultWiring.ts`

## Intent

Remove named Effect workflow wrappers that add no behavior beyond exact argument forwarding.

## Detection boundary

Reports named generator-based `Effect.fn` wrappers whose sole body is `return yield*` of one exact parameter-forwarding invocation, including rest/spread forwarding.

## Exemptions and non-findings

Output transforms, recovery, sequencing, direct-return functions, and `Context.Service` implementation operations are quiet.

## Guidance

Export the forwarded operation directly; retain `Effect.fn` only when the workflow adds behavior.

## Dependencies

TypeScript checker, Effect symbol provenance, exact-forwarder analysis, and Context service-operation classification.

## Tests and examples

- `tests/noTrivialEffectFn.test.ts`
- `tests/fixtures/no-trivial-effect-fn/`
- `packages/guidance/examples/no-trivial-effect-fn/`

## Skill migration

- Proposed skill: lint-rule-no-trivial-effect-fn
- Scope: local file
- Required semantic context: resolved Effect and Context symbols plus function-body structure
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse `noTrivialEffectFnMatcher` with runner-supplied source files

## Open questions

None identified.
