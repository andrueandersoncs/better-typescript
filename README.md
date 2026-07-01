# Better TypeScript

Better TypeScript is a simple command-line linter for TypeScript projects. It uses the official `typescript` package to analyze source files, understand their types, and provide actionable feedback about code quality and type-safety issues.

## Goal

The goal is to build a focused TypeScript analysis tool that:

- Loads a TypeScript project from its `tsconfig.json`
- Uses the TypeScript compiler API to inspect source files and type information
- Reports useful feedback directly in the terminal
- Checks project code against a fixed set of built-in rules
- Works as a straightforward CLI without a plugin architecture

## Rules

Better TypeScript will include a specific set of built-in rules. Each rule scans the target project for a particular pattern or type-safety concern.

When a rule finds a match, the CLI should report:

- The rule name
- The file and location of the match
- A short description of the issue
- A remediation hint explaining how to improve the code
- A passing example of the preferred pattern

Rules are part of the core CLI and are not intended to be loaded through plugins or third-party extensions.

## Non-goals

This project is intentionally small in scope. It does not aim to provide:

- A plugin system
- A framework for custom third-party rules
- A replacement for `tsc`, ESLint, or Prettier
- Automatic code formatting

## How it works

The CLI will use the `typescript` package to:

1. Read the target project's TypeScript configuration.
2. Create a TypeScript `Program`.
3. Use the type checker to analyze source files.
4. Run the built-in rules against the project.
5. Collect matches, diagnostics, and remediation hints.
6. Print results in a concise CLI-friendly format.

## Intended usage

```sh
better-typescript
```

By default, the CLI analyzes the current working directory and prints every match.

### Options

- `--project <directory>`: Analyze a specific project directory instead of the current working directory.
- `--limit <integer>`: Maximum number of rule matches to display.
- `--offset <integer>`: Number of rule matches to skip before displaying.
- `--format <text|json>`: Output format. `text` (default) groups matches by rule with a remediation hint and a passing example; `json` emits the same report as machine-readable JSON for tooling and agents.

### Subcommands

- `better-typescript rules`: Print the style guide compiled from every built-in rule — its id, description, and bad/good example snippets. Use `--format json` for a machine-readable rule catalog. The guide is generated from the same rule definitions the linter enforces, so instruction and enforcement cannot drift.

Use `--limit` and `--offset` together to page through large result sets:

```sh
better-typescript --limit 20             # matches 1-20
better-typescript --limit 20 --offset 20 # matches 21-40
```

When the output is truncated, the CLI prints the visible range and the `--offset` value for the next page. The exit code reflects the full result set: it is `1` whenever any matches exist, even if the current page is empty.

## Project status

This project is in the initial planning stage.
