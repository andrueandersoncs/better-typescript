# export-surface

## Classification

Silent workspace export evidence policy in the core Architecture Explore fleet.

## Active wiring

`architectureExploreCorePolicies`; enabled by every Architecture Explore wiring.

## Implementation sources

- Guidance: `packages/guidance/src/policies/exportSurface.ts`
- Matcher: `packages/matchers/src/builtins/exportSurface.ts`
- Symbol index: `packages/matchers/src/builtins/architectureExplore/programSymbols.ts`

## Intent

Describe each production file's exported symbols and all references outside the declaring file.

## Detection boundary

For a non-test source in a non-package project, emit one file fact when it has indexed exports.
Record symbol name and kind, referencing file and test-file counts, and production plus test call
count. Home-file references are excluded by the shared index.

## Exemptions and non-findings

Skip test files, package projects, and files with no indexed export. Package projects participate
through workspace identity and import evidence instead.

## Guidance

Use external usage to distinguish public contracts from test-only surface.

## Dependencies

Consumed by test past interface and invisible tests.

## Tests and examples

- `tests/architectureEvidenceWorkspace.test.ts`
- `tests/architectureExploreDerive.test.ts`

## Skill migration

Retain symbol-resolved reference indexing as deterministic support. Fold the fact into workspace
testability skills rather than exposing it directly.

## Open questions

None identified.
