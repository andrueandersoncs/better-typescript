# test-only-exports

## Classification

Silent program-level architecture evidence policy in the core Architecture Explore fleet.

## Active wiring

`architectureExploreCorePolicies`; enabled by every Architecture Explore wiring.

## Implementation sources

- Guidance: `packages/guidance/src/policies/testOnlyExports.ts`
- Matcher: `packages/matchers/src/builtins/testOnlyExports.ts`
- Reference index: `packages/matchers/src/builtins/architectureExplore/architectureEvidence.ts`

## Intent

Identify production exports exposed only so tests can call implementation details.

## Detection boundary

In a non-package project, emit one fact for each exported function entry with at least one test
reference and no production reference. Record test paths and call count.

## Exemptions and non-findings

Skip test files, files outside the current project, package projects, exports with production use,
and exports with no test use. Cross-package cases are handled through export-surface joins.

## Guidance

Test observable behaviour through the production interface and make test-only helpers private.

## Dependencies

Consumed by test past interface.

## Tests and examples

- `tests/architectureEvidence.test.ts`
- `tests/architectureExploreDerive.test.ts`

## Skill migration

Fold into the test-past-interface skill. Keep symbol-reference indexing as deterministic support;
run at Program scope before cross-workspace test analysis.

## Open questions

None identified.
