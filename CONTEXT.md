# Better TypeScript

Better TypeScript is a TypeScript linter with syntax- and type-based rules.

## Domain

**Analysis run**: One resource-owned workspace pass that discovers projects, loads root
configuration, constructs and lints one TypeScript Program at a time, globally normalizes
Violations, and releases each Program before continuing.

**LoadedWorkspace**: A discovered TypeScript workspace containing one or more `LoadedProject`
values. It is the project value accepted by the linter.

**LoadedProject**: One TypeScript Program and its configuration and root paths.

**Rule**: A named check invoked for exactly one applicable project source. Each built-in Rule has a
canonical `packages/rules/src/rules/<rule-name>/` home that owns its identity, recognition, target,
message, and exclusive helpers. Shared indexes expose facts used by multiple Rules rather than Rule
kinds or verdicts. Scanner execution and local findings stay source-file scoped.

**Local finding**: Actionable message text plus either a syntax node or an explicit source position.
It has no rule identity, configured level, serialized path, line, or column.

**Violation**: Core's final serialized occurrence. Core combines a local finding with its Rule and
configuration, normalizes its workspace-relative path, locates its line and column, then exactly
deduplicates and deterministically orders the complete output.

**Built-in rule catalog**: The deterministic set of 126 selected Rules enabled by the CLI.

## Packages

- `@better-typescript/core` owns complete analysis runs, final Violation materialization, and
  focused project loading and linting interfaces.
- `@better-typescript/rules` owns built-in Rule implementations and the catalog.
- `@better-typescript/cli` invokes the catalog and renders Violations.
