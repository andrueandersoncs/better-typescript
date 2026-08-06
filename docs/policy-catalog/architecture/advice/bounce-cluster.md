# bounce-cluster

## Classification

Derived directory-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; available in every Architecture Explore wiring.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/bounceCluster.ts`
- Evidence: `module-graph`, `pass-through-wrappers`, and `composition-forwarders`

## Intent

Find connected paths of thin forwarding Modules that force readers to bounce across files.

## Detection boundary

Build an undirected graph among files containing deletable forwarders. Emit for connected components
with at least three distinct files and at least one internal import edge. Anchor at their common
directory and report thin-file and edge counts.

## Exemptions and non-findings

Ignore disconnected thin files, components with fewer than three files, and connected files whose
wrappers retain caller leverage or non-call contracts.

## Guidance

Collapse the path behind one deeper interface so policy and verification become local.

## Dependencies

Consumes module graph and deletion-test forwarding evidence.

## Tests and examples

- `tests/architectureExploreDerive.test.ts`
- `packages/guidance/examples/bounce-cluster/`

## Skill migration

Proposed skill: `lint-rule-bounce-cluster`. Scope: Program graph, directory output. Run after the
architecture evidence phase with deterministic graph components as candidates.

## Open questions

None identified.
