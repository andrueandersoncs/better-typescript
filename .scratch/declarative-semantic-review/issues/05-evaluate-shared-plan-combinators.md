# 05 — Evaluate shared plan combinators

**Specification:** [Declarative semantic review](../spec.md)

Status: resolved

Blocked by: 04

## What to decide

After the concrete route, relevance, selected-evidence, and final stages exist, determine whether any
shared planning combinator earns its interface.

Apply the deletion test: a shared module is justified only when removing it would duplicate real
planning or interpretation behavior across at least two stages. Similar names or shapes are not
evidence of a shared abstraction.

Record the decision in the specification. Implement only the smallest proven internal abstraction,
then remove the concrete duplication it replaces.

## Acceptance criteria

- [x] Inventory the repeated declaration and interpretation behavior in the completed stage code.
- [x] Compare keeping concrete stages with at least one minimal shared interface.
- [x] Evaluate Applicative mapping/composition and Selective branching separately.
- [x] Reject a general Monad, `Bind`, callback DSL, exported framework, and pass-through wrappers.
- [x] Document the decision and evidence in `spec.md`, including a clear “no abstraction” result if
      reuse is not demonstrated.
- [x] If an abstraction is justified, it has at least two real callers, reduces total caller
      knowledge, and preserves the explicit selected-evidence stage.
- [x] If code changes, add only narrow behavioral coverage and remove every replaced path.
- [x] `./scripts/check.sh` passes.

## Non-goals

- Creating an abstraction to match category-theory terminology.
- Optimizing TypeSafe request count, tokens, latency, or price.
- Changing semantic review behavior.
- Making internal planning types public.

## Answer

The deletion test found no justified cross-stage abstraction. The completed route, relevance,
selected-evidence, and final stages share evaluator protocol plumbing, but not declaration or
interpretation semantics. A minimal Applicative request/collect interface would expose transport
partitioning and add caller knowledge without deleting stage logic. Selective reuse is confined to
the existing route-local `routeChoice[T]`.

The decision and evidence are recorded in
`.scratch/declarative-semantic-review/spec.md`. No source or test code changed. A general Monad,
`Bind`, callback DSL, exported framework, and pass-through wrapper remain rejected; the explicit
`selectedEvidence` transition remains intact.

Verification:

- `./scripts/check.sh` — passed.
