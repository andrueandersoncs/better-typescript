# Better TypeScript

Better TypeScript is a conventional TypeScript linter.

## Domain

**LoadedWorkspace**: A discovered TypeScript workspace containing one or more `LoadedProject`
values. It is the project value accepted by the linter.

**LoadedProject**: One TypeScript Program and its configuration and root paths.

**Rule**: A named check that examines an applicable project source and returns located Violations.

**Violation**: One actionable rule occurrence with a rule name, message, file path, line, and
column.

**Built-in rule catalog**: The deterministic set of 126 selected Rules enabled by the CLI.

## Packages

- `@better-typescript/core` loads projects and runs Rules.
- `@better-typescript/rules` owns built-in Rule implementations and the catalog.
- `@better-typescript/cli` invokes the catalog and renders Violations.
