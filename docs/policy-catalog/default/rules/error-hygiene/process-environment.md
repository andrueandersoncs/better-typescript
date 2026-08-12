# process-environment

## Classification

Reported default policy; runtime configuration; symbol-aware file detection.

## Active wiring

Listed in `environmentPolicies`, then `defaultWiring`; self-hosted on all product source files.

## Implementation sources

- `packages/matchers/src/builtins/processEnvironment.ts`
- `packages/guidance/src/preset/defaultWiring.ts`

## Intent

Route production runtime configuration through Effect Config instead of ambient environment reads.

## Detection boundary

Reports symbol-resolved static and computed paths rooted at `process.env` in production files, including unclassified Physical Modules. One outermost access produces one finding.

## Exemptions and non-findings

Conventional composition roots and test files, shadowed `process` bindings, and non-environment process properties are quiet.

## Guidance

Declare configuration with Effect Config and inject a `ConfigProvider` at the application boundary.

## Dependencies

TypeScript checker, ambient process symbol provenance, Physical Module classification, and composition-root detection.

## Tests and examples

- `tests/processEnvironment.test.ts`
- `tests/fixtures/process-environment/`
- `packages/guidance/examples/process-environment/`
- `tests/workflows.test.ts`

## Skill migration

- Proposed skill: lint-rule-process-environment
- Scope: local file
- Required semantic context: resolved process symbols, access paths, and file classification
- Runner phase/fleet: detection / error-hygiene
- Deterministic candidate generation: reuse `processEnvironmentMatcher` with runner-supplied source files

## Open questions

None identified.
