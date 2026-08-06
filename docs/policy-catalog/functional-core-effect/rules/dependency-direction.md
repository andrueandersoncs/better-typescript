# dependency-direction

## Classification
Reported functional-core architecture boundary rule.

## Active wiring
`functional-core-effect-boundaries` via `functionalCoreEffectWiring`. Self-host uses custom roles: `packages/core/src/engine` as domain and `packages/cli/src` as root.

## Implementation sources
`packages/matchers/src/builtins/functionalCoreEffect/functionalCoreEffect.ts`; `packages/matchers/src/builtins/functionalCoreEffect/moduleResolution.ts`; `packages/guidance/src/policies/functionalCoreEffectBoundaries.ts`.

## Intent
Keep dependencies pointing inward through domain, port, application, adapter, and root layers.

## Detection boundary
Resolves import and re-export module targets to classified source files and checks the explicit role matrix: domain→domain only; port→domain/port; application→domain/port/application; adapter adds adapter; root/test may import all.

## Exemptions and non-findings
Unresolved/external/unclassified targets, unclassified importers, and allowed role pairs are quiet. Both type and value imports participate.

## Guidance
Move the dependency behind a domain-owned port or move behavior outward.

## Dependencies
Workspace TypeScript module resolution, source-file role classifier, import/export syntax.

## Tests and examples
Positive application imports/re-export of adapter: `tests/fixtures/functional-core-effect/src/application/badDependency.ts` and `tests/fixtures/functional-core-effect/src/application/badReexport.ts`; allowed neighbors are asserted in `tests/functionalCoreEffect.test.ts`. Shared boundary example is domain-specific.

## Skill migration
Propose `lint-rule-functional-core-dependency-direction`; workspace scope; resolved module graph plus roles; functional-core boundaries fleet, graph phase; deterministic candidate generation: complete.

## Open questions
No fixture isolates every allowed/forbidden matrix edge.
