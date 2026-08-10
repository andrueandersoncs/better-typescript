# Project Topology

## Execution path

1. `packages/cli` discovers a workspace and loads `better-typescript.config.ts`.
2. `packages/core/src/project` materializes TypeScript Programs and validates wiring.
3. `packages/matchers` converts syntax, type, Program, or workspace facts into typed matches.
4. `packages/guidance` couples matches to messages, hints, examples, and derived Advice.
5. `packages/core/src/engine` locates findings, materializes Signals, derives Advice, and renders events.

## Package classification

| Package | Catalog role |
| --- | --- |
| `packages/matchers` | Detection semantics and shared evidence infrastructure |
| `packages/guidance` | Named policies, remediation prose, presets, and advice derivation |
| `packages/core` | Policy, Wiring, Signal, Advice, report, project, and watch runtime |
| `packages/cli` | Configuration, one-shot/watch execution, and output boundary |
| `packages/workflows` | Experimental agent-session workflow; not currently policy wiring |

## Source surfaces

- `packages/guidance/src/policies/` contains 103 files: active Policy definitions plus the
  concept-control message/hint helpers.
- `packages/guidance/src/preset/` defines default fleet order and the specialized wirings.
- `packages/guidance/src/derive/`, `architectureExplore/`, and the named advice directories derive
  aggregate guidance from completed Signals.
- `packages/matchers/src/builtins/` contains policy recognizers plus shared Effect-quality,
  functional-core, architecture, and semantic-module support. Support files are implementation
  dependencies, not separate user-facing policies.
- `tests/`, `tests/fixtures/`, and `packages/guidance/examples/` are the behavioral and remediation
  evidence linked from individual catalog entries.

## Self-hosting

`better-typescript.config.ts` applies the reporting-only Wiring to every package source and a
placement Wiring to configuration, package sources, and tests. The placement Wiring runs the silent
`semantic-module-placement` Check and derives only its own placement Advice.

Disabled checks:

- `prefer-curried-data-last-functions`
- `effect-quality-advice-evidence`
- `functional-core-effect-shape-evidence`
- Architecture Explore: `pass-through-wrappers`, `interface-burden`, `module-graph`,
  `test-only-exports`, `seam-leakage-evidence`, `import-usage`, `module-identity`,
  `export-surface`, `external-dependency-construction`, `single-adapter-seams`,
  `composition-forwarders`, `module-scope-effects`, `context-tag-seams`,
  `composition-fingerprints`

The reporting Wiring emits no derived Advice. These checks and Advice derivations remain available
to explicit consumer configurations.

## Catalog boundary

Create one entry for every independently actionable reported rule or derived advice kind. Create a
separate evidence entry for silent policies. Keep matcher helpers, indexes, schemas, core execution,
CLI transport, and workflow prototypes in this topology unless an actionable policy directly owns
them.
