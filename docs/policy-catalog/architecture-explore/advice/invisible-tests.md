# invisible-tests

## Classification

Derived project-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; available in every Architecture Explore wiring.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/invisibleTests.ts`
- Evidence: `module-graph`, `import-usage`, and `export-surface`

## Intent

Warn when architecture analysis cannot observe any test project, making test-aware conclusions incomplete.

## Detection boundary

Collect all non-empty workspace paths visible in module graph, import usage, and export surface. Emit
one project advice when at least one path exists and none is classified as a test path.

## Exemptions and non-findings

Stay silent when evidence is empty or any visible path is a test path.

## Guidance

Reference the test project from the root tsconfig or otherwise include tests in analysis.

## Dependencies

Consumes three core architecture evidence surfaces and has no refactor-example asset.

## Tests and examples

- `tests/architectureExploreStructureAdvisers.test.ts`
- No dedicated refactor example.

## Skill migration

Proposed skill: `lint-rule-invisible-tests`. Scope: project configuration and workspace evidence. Run
once before test-dependent architecture advice and block claims of complete test analysis when it fires.

## Open questions

None identified.
