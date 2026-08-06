# test-past-interface

## Classification

Derived file-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; available in every Architecture Explore wiring.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/testPastInterface.ts`
- Evidence: `test-only-exports`, test-origin `seam-leakage-evidence`, `export-surface`,
  `module-identity`, and `import-usage`

## Intent

Find tests coupled to implementation surface that production callers do not use.

## Detection boundary

Emit for local test-only exports, test-origin deep imports, or exported workspace symbols with no
production caller and at least one cross-project test import. Aggregate test-only symbol, test-call,
and deep-import counts at the affected production or test file.

## Exemptions and non-findings

Do not flag an exported symbol with any local or cross-project production caller. Same-project test
use represented only in export-surface data is excluded from the workspace join.

## Guidance

Exercise observable behaviour through the production interface, privatize test helpers, and replace
deep test imports with the declared seam.

## Dependencies

Consumes five architecture evidence surfaces and workspace import-edge joining.

## Tests and examples

- `tests/architectureExploreDerive.test.ts`
- `tests/architectureEvidenceWorkspace.test.ts`
- `packages/guidance/examples/test-past-interface/`

## Skill migration

Proposed skill: `lint-rule-test-past-interface`. Scope: Program and workspace symbol usage. Run after
all architecture evidence is available; keep deterministic symbol/import joins.

## Open questions

None identified.
