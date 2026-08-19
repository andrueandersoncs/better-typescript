# Better TypeScript

Better TypeScript is a conventional TypeScript linter.

## Domain

**Analysis run**: One resource-owned workspace pass that discovers projects, loads root
configuration, constructs and lints one TypeScript Program at a time, globally normalizes
Violations, and releases each Program before continuing.

**LoadedWorkspace**: A discovered TypeScript workspace containing one or more `LoadedProject`
values. It is the project value accepted by the linter.

**LoadedProject**: One TypeScript Program and its configuration and root paths.

**Rule**: A named check that examines an applicable project source and returns located Violations.

**Violation**: One actionable rule occurrence with a rule name, message, file path, line, and
column.

**Built-in rule catalog**: The deterministic set of 126 selected Rules enabled by the CLI.

## Packages

- `@better-typescript/core` owns complete analysis runs and retains focused project loading and
  linting interfaces.
- `@better-typescript/rules` owns built-in Rule implementations and the catalog.
- `@better-typescript/cli` invokes the catalog and renders Violations.
