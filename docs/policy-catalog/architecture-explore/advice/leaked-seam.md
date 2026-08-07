# leaked-seam

## Classification

Derived file- or directory-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; available in every Architecture Explore wiring.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/leakedSeam.ts`
- Evidence: `seam-leakage-evidence` and `module-graph`

## Intent

Identify interfaces repeatedly bypassed by deep imports or bidirectional directory dependencies.

## Detection boundary

Emit file advice when one file contains at least two internal/source-path leakage facts. Separately,
build production cross-directory import edges and emit directory advice for every pair with imports
in both directions; report total cross-import count.

## Exemptions and non-findings

One deep import is below the file threshold. Test edges and one-way directory dependencies do not
create directory advice; same-directory edges are ignored.

## Guidance

Route dependencies through one public seam and give shared vocabulary one home so dependencies point
one way.

## Dependencies

Consumes seam-leakage and module-graph evidence.

## Tests and examples

- `tests/architectureExploreDerive.test.ts`
- `packages/guidance/examples/leaked-seam/`

## Skill migration

Proposed skill: `lint-rule-leaked-seam`. Scope: local imports plus workspace directory graph. Run in
the architecture advice phase; deterministic path and graph analysis should supply candidates.

## Open questions

None identified.
