# single-adapter-seams

## Classification

Silent Program-level OOP architecture evidence policy.

## Active wiring

`architectureExploreOopPolicies`; enabled by the combined and OOP Architecture Explore wirings.

## Implementation sources

- Guidance: `packages/guidance/src/policies/singleAdapterSeams.ts`
- Matcher: `packages/matchers/src/builtins/singleAdapterSeams.ts`
- Type helpers: `packages/matchers/src/support/tsType.ts`

## Intent

Find speculative injected interfaces that have only one real implementation.

## Detection boundary

Consider exported, non-empty interfaces whose every member is callable. Require the interface to be
injected through an exported function, exported class member, or exported function-valued variable.
Count implementing classes and contextually typed object literals as adapters. Emit only for exactly
one production adapter and no test adapter.

## Exemptions and non-findings

Ignore data-bearing or empty interfaces, non-exported seams, interfaces not injected into exported
behaviour, zero or multiple production adapters, and any seam with a test adapter.

## Guidance

Remove a hypothetical port until behaviour actually varies across production and test adapters.

## Dependencies

Consumed by hypothetical seam.

## Tests and examples

- `tests/architectureEvidence.test.ts`
- `tests/fixtures/architecture-evidence-seams/`
- `packages/guidance/examples/hypothetical-seam/`

## Skill migration

Preserve symbol/type indexing as deterministic support for a workspace-scoped seam skill. Run in the
OOP evidence phase before hypothetical-seam advice.

## Open questions

None identified.
