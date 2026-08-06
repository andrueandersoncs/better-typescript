# module-identity

## Classification

Silent package-identity evidence policy in the core Architecture Explore fleet.

## Active wiring

`architectureExploreCorePolicies`; enabled by every Architecture Explore wiring.

## Implementation sources

- Guidance: `packages/guidance/src/policies/moduleIdentity.ts`
- Matcher: `packages/matchers/src/builtins/moduleIdentity.ts`
- Workspace joining: `packages/guidance/src/architectureExplore/evidence.ts`

## Intent

Map Physical Modules to the package specifiers through which other projects import them.

## Detection boundary

Decode `package.json` name and exports, choose `import`, then `default`, then the first string target,
and map exact or single-star export targets to TypeScript files through `rootDir` and `outDir`.
Emit aliases for each matched file.

## Exemptions and non-findings

Emit nothing for missing or malformed package metadata, missing `outDir`, unmatched files, or export
patterns without exactly one star on both sides.

## Guidance

Use aliases to join raw package import specifiers to workspace source paths.

## Dependencies

Consumed by `workspaceImportEdges`, primarily for cross-package test-past-interface analysis.

## Tests and examples

- `tests/architectureEvidenceWorkspace.test.ts`

## Skill migration

Keep as deterministic package/tsconfig resolution support rather than a lint skill. Run once per
package project before workspace advice.

## Open questions

None identified.
