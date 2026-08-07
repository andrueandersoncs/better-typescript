# prefer-effectful-function

## Classification

Reported default policy; Effect boundary idiom; file-local semantic detection.

## Active wiring

Listed in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/preferEffectfulFunction.ts
- packages/matchers/src/builtins/preferEffectfulFunction.ts
- packages/matchers/src/support/compositionRoot.ts
- packages/matchers/src/support/tsSignature.ts

## Intent

Prevent ordinary functions from hiding effects by synchronously executing them.

## Detection boundary

Finds named variable functions and function declarations whose concise or sole return expression is a call resolving to Effect.runSync. Variable declarations with an explicit function type and files classified as composition roots are skipped.

## Exemptions and non-findings

Effect.runSyncExit, local lookalikes, multi-statement setup before runSync, callback-contained runSync, explicit variable contracts, composition roots, and functions returning Effects are not findings.

## Guidance

Return the Effect and compose with yield* or flatMap; reserve runSync for the runtime boundary.

## Dependencies

TypeScript checker, Effect symbol provenance, function-body normalization, and composition-root path classification.

## Tests and examples

- tests/preferEffectfulFunction.test.ts
- tests/fixtures/prefer-effectful-function/
- packages/guidance/examples/prefer-effectful-function/

## Skill migration

- Proposed skill: lint-rule-prefer-effectful-function
- Scope: local file
- Required semantic context: resolved runSync symbol, function contract, and composition-root classification
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse preferEffectfulFunctionMatcher with runner-supplied project paths

## Open questions

None identified.
