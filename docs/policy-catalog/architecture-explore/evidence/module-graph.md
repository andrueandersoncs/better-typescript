# module-graph

## Classification

Silent program-level architecture evidence policy in the core Architecture Explore fleet.

## Active wiring

`architectureExploreCorePolicies`; enabled by every Architecture Explore wiring.

## Implementation sources

- Guidance: `packages/guidance/src/policies/moduleGraph.ts`
- Matcher: `packages/matchers/src/builtins/moduleGraph.ts`
- Shared edge index: `packages/matchers/src/builtins/architectureExplore/moduleEdges.ts`

## Intent

Expose resolved first-party Module edges for relational architecture analysis.

## Detection boundary

For each source file with at least one resolved project import, emit one fact containing deduplicated
project-relative and workspace-relative imported paths.

## Exemptions and non-findings

Ignore unresolved and external-package imports and files with no first-party edge. Import count by
itself is not actionable.

## Guidance

Use the graph to find connected forwarding paths, bidirectional directory seams, hubs, and visible
test participation.

## Dependencies

Consumed by bounce cluster, leaked seam, hub module, invisible tests, and workspace import joins used
by test past interface.

## Tests and examples

- `tests/architectureEvidence.test.ts`
- `tests/architectureEvidenceReuse.test.ts`
- `tests/architectureEvidenceWorkspace.test.ts`

## Skill migration

Retain a deterministic resolver-backed graph extractor. Run once per Program or workspace and pass
the normalized edge set to architecture advice skills.

## Open questions

None identified.
