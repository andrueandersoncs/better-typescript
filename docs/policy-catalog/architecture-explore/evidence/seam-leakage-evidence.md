# seam-leakage-evidence

## Classification

Silent import-level architecture evidence policy in the core Architecture Explore fleet.

## Active wiring

`architectureExploreCorePolicies`; enabled by every Architecture Explore wiring.

## Implementation sources

- Guidance: `packages/guidance/src/policies/seamLeakageEvidence.ts`
- Matcher: `packages/matchers/src/builtins/seamLeakageEvidence.ts`
- Import extraction: `packages/matchers/src/builtins/architectureExplore/importElements.ts`

## Intent

Measure imports that bypass a declared public Module seam.

## Detection boundary

Emit `internal-path` when normalized import segments contain `internal`. Emit `source-path` when a
package or outside-project import path contains a `src` segment. Record import depth and whether the
importer is a test.

## Exemptions and non-findings

Ignore ordinary public imports and relative imports that remain inside the project without an
`internal` segment. Dynamic imports are outside the import-declaration matcher.

## Guidance

Route callers through the Module's public interface so implementation paths can change locally.

## Dependencies

Consumed by leaked seam and test past interface.

## Tests and examples

- `tests/architectureEvidence.test.ts`
- `tests/architectureExploreDerive.test.ts`

## Skill migration

Use deterministic import-path candidate generation and let the consuming architecture skill judge
the aggregate. Run locally before file- and directory-level advice.

## Open questions

None identified.
