# ADR-0012: Monorepo split into core, checks, and CLI

## Status

Accepted. The fixture location and loader consequence is superseded by
[ADR-0018](0018-check-owned-authoring-and-package-examples.md); the package split and dependency
direction remain accepted.

## Date

2026-07-12

## Context

ADR-0005 made the kernel the product and the built-in fleet a reference preset. ADR-0009 kept that
boundary inside one published package via subpath exports (`better-typescript/engine/*`,
`better-typescript/preset`, `better-typescript/checks/*`) because a multi-package split looked
premature: version skew and peer-dependency surface without an independent release cadence.

The source layout already mirrored the product boundary (`src/engine` + `src/project` vs
`src/checks` + `src/preset` + CLI). Maintaining that boundary only through subpaths made package
ownership, dependency direction, and fixture loading harder to see and enforce as the fleet grew.

## Decision

Turn the repository into an npm workspaces monorepo with three packages:

1. `@better-typescript/core` — analysis kernel (`engine/*`, `project/*`)
2. `@better-typescript/checks` — built-in checks, default wiring, and fixture example loading for
   the preset
3. `@better-typescript/cli` — `better-typescript` binary

Dependency direction is one-way: `checks` and `cli` depend on `core`; `cli` depends on `checks` for
the default wiring fallback. There is still no dynamic plugin discovery, no `extends` chain, and no
separate plugin runtime. Config remains reviewed TypeScript (`better-typescript.config.ts`) composed
against core primitives and optional preset imports.

This ADR supersedes ADR-0009's "single-package boundary" packaging decision. ADR-0009's runtime
model remains: fleets are `Wiring`, rules/checks are AST-only, derive/advice composes signals, and
stdout stays NDJSON by default.

## Alternatives Considered

### Keep one package with subpath exports

- Pros: no workspace tooling, no cross-package version matrix.
- Cons: the soft boundary stays a convention; core cannot be depended on without pulling the fleet;
  package scripts and fixture ownership stay mixed.
- Rejected now that the source split is stable and the monorepo cost is small.

### Two packages (kernel+CLI vs preset)

- Pros: fewer packages.
- Cons: the CLI default fallback still couples the binary to the fleet, while hiding that the CLI is
  a thin shell over core wiring loaders.
- Rejected in favor of an explicit three-package cut matching ownership.

## Consequences

- Public imports move from `better-typescript/engine/*` and `better-typescript/checks/*` to
  `@better-typescript/core/engine/*` and `@better-typescript/checks/<name>`.
- Builds are per-package; root scripts orchestrate workspace builds.
- Preset fixture examples remain under `tests/fixtures` and are loaded by
  `@better-typescript/checks/fixtureExamples`.
- ADR-0009's anti-goals still hold: no dynamic plugins, no suppressions, no severities, no per-check
  options, no hot-reloaded wiring graph.
