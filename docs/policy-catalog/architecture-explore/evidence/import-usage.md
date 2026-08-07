# import-usage

## Classification

Silent file-level architecture evidence policy in the core Architecture Explore fleet.

## Active wiring

`architectureExploreCorePolicies`; enabled by every Architecture Explore wiring.

## Implementation sources

- Guidance: `packages/guidance/src/policies/importUsage.ts`
- Matcher: `packages/matchers/src/builtins/importUsage.ts`
- Evidence: `ImportUsageData` and `ImportedNameUsage`

## Intent

Record how strongly each static import binding participates in its importing file.

## Detection boundary

Emit one fact per string-literal import declaration, preserving source order. Record default,
named, aliased, and namespace bindings with syntactic reference counts. Count direct identifier
calls and namespace property calls separately, and record importer workspace path and test status.

## Exemptions and non-findings

Ignore the binding occurrence inside its own import. Side-effect imports have no names. Counting is
syntactic and name-based, so local shadowing can inflate or hide usage.

## Guidance

Treat counts as evidence rather than a direct defect.

## Dependencies

Consumed by registration ceremony, invisible tests, and workspace import edges used by test past
interface and hub analysis.

## Tests and examples

- `tests/architectureEvidenceReuse.test.ts`
- `tests/architectureEvidenceWorkspace.test.ts`
- `tests/fixtures/architecture-evidence-import-usage/`

## Skill migration

Preserve the single-pass AST counter as deterministic evidence. Run once per file and provide facts
to workspace architecture skills.

## Open questions

Whether skill migration should retain known name-shadowing behavior or require symbol-resolved counts.
