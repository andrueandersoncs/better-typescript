# context-tag-seams

## Classification

Silent Program-level FP architecture evidence policy.

## Active wiring

`architectureExploreFpPolicies`; enabled by the combined and FP Architecture Explore wirings.

## Implementation sources

- Guidance: `packages/guidance/src/policies/contextTagSeams.ts`
- Matcher: `packages/matchers/src/builtins/contextTagSeams.ts`
- Tests: `tests/architectureEvidenceSeams.test.ts`

## Intent

Measure whether an Effect service seam has real adapters and consumers.

## Detection boundary

Find named production classes extending resolved Effect `Context.Tag`, `Context.Service`,
`Context.Reference`, or `Effect.Service` APIs. Count value references outside the declaration,
imports, and type positions. References used through Layer constructors or tag `.of` are adapters;
other value references are consumers. Split adapters by production and test source.

## Exemptions and non-findings

Ignore seam declarations in test files, unnamed classes, unrelated lookalike APIs, import/type-only
references, and references inside the declaration.

## Guidance

Counts are evidence only; they support deciding whether the service seam earns its surface.

## Dependencies

Consumed by hypothetical seam.

## Tests and examples

- `tests/architectureEvidenceSeams.test.ts`
- `tests/fixtures/architecture-evidence-seams/`
- `packages/guidance/examples/hypothetical-seam/`

## Skill migration

Keep resolved-symbol and reference classification as deterministic support for a Program-scoped
Effect seam skill. Run in the FP evidence phase.

## Open questions

None identified.
