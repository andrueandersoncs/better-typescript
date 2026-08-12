# prefer-function-composition

## Classification

Reported default policy; function and Effect pipeline composition; symbol-aware local analysis.

## Active wiring

Listed in `compositionPolicies`, then `defaultWiring`; self-hosted on all product source files.

## Implementation sources

- `packages/matchers/src/builtins/preferFunctionComposition.ts`
- `packages/guidance/src/preset/defaultWiring.ts`

## Intent

Replace manually threaded locals with explicit function composition.

## Detection boundary

Reports simple unary block pipelines, property-projecting adapters, and contiguous Effect transformation chains ending in `Effect.runPromise`. Effect chains may contain arbitrary applicable Effect API stages in data-first calls, free `pipe(...)`, or Effect method `.pipe(...)`; each symbol must have exactly one downstream use.

## Exemptions and non-findings

Control flow, branches, captured or reused intermediates, extra terminal uses, and already composed expressions are quiet.

## Guidance

Use `pipe`, `flow`, or `Function.compose`; Effect chains specifically use one data-last `pipe` through `Effect.runPromise`.

## Dependencies

TypeScript checker, symbol-reference analysis, Effect API provenance, and pipe-call classification.

## Tests and examples

- `tests/preferFunctionComposition.test.ts`
- `tests/fixtures/prefer-function-composition/`
- `packages/guidance/examples/prefer-function-composition/`

## Skill migration

- Proposed skill: lint-rule-prefer-function-composition
- Scope: local file
- Required semantic context: resolved pipeline symbols, Effect stages, and terminal use
- Runner phase/fleet: detection / abstraction-and-composition
- Deterministic candidate generation: reuse `preferFunctionCompositionMatcher` with runner-supplied source files

## Open questions

None identified.
