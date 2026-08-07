# registration-ceremony

## Classification

Derived file-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; available in every Architecture Explore wiring.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/registrationCeremony.ts`
- Evidence: `import-usage`

## Intent

Find files that manually restate a large registry through many nearly single-use imports.

## Detection boundary

For a production importer, require at least 15 distinct module specifiers and at least one imported
binding. Emit when at least 80 percent of imported names have two or fewer syntactic references.

## Exemptions and non-findings

Ignore test importers, fewer than 15 distinct imports, empty binding sets, and low-use ratios below
0.8.

## Guidance

Collapse registration behind one authoring interface so adding an entry changes one place.

## Dependencies

Consumes import-usage evidence.

## Tests and examples

- `tests/architectureExploreStructureAdvisers.test.ts`
- `packages/guidance/examples/registration-ceremony/`

## Skill migration

Proposed skill: `lint-rule-registration-ceremony`. Scope: file. Run in the architecture advice phase
using deterministic import counts, then let the agent judge whether the file truly encodes registration.

## Open questions

Whether symbol-resolved references should replace the current syntactic low-reference ratio.
