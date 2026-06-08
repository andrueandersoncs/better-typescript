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

By default, the CLI should analyze the current working directory. Future options may allow passing a specific project path or `tsconfig.json` file.

## Project status

This project is in the initial planning stage.
