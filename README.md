# Better TypeScript

Better TypeScript is a conventional TypeScript linter for coding agents. It discovers a TypeScript
project, runs every built-in rule, and prints a flat list of actionable violations.

## Usage

```sh
bun run build
better-typescript --project .
```

The current directory is used when `--project` is omitted. The command exits successfully after a
completed analysis even when violations are present.

Stdout is NDJSON by default. Each line has one shape:

```json
{
  "ruleName": "no-throw",
  "message": "Avoid throwing errors with throw. Return a typed error through Effect instead.",
  "filePath": "src/main.ts",
  "line": 4,
  "column": 3
}
```

Use `--pretty` for the same fields in human-readable form:

```text
src/main.ts:4:3 no-throw Avoid throwing errors with throw. Return a typed error through Effect instead.
```

Operational status and project-loading failures go to stderr.

## Architecture

This Bun workspace has exactly three packages:

- `@better-typescript/core` owns project discovery, TypeScript Programs, `Rule`, `Violation`, and
  deterministic `lint` execution.
- `@better-typescript/rules` owns the 126 built-in rules and the deterministic `builtinRules`
  catalog.
- `@better-typescript/cli` owns argument parsing and violation rendering.

Dependencies point from CLI to core and rules, and from rules to core. Core never depends on the
built-in catalog.

There is no project configuration file, plugin graph, severity, suppression, silent mode, aggregate
report phase, or watch mode. Every built-in rule runs wherever its own local predicate applies.

## Programmatic use

```ts
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { builtinRules } from "@better-typescript/rules/builtinRules"

const project = await Effect.runPromise(loadProject({ projectPath: "." }))
const violations = lint({ project, rules: builtinRules })
```

A custom rule has only a stable name and a source-file check:

```ts
import type { Rule } from "@better-typescript/core/linter"

const noConsoleLog: Rule = {
  name: "acme/no-console-log",
  check: (context) => {
    // Return located violations found in context.sourceFile.
    return []
  }
}
```

See [`docs/rules.md`](docs/rules.md) for the complete built-in catalog and
[`examples/programmatic/main.ts`](examples/programmatic/main.ts) for a runnable example.

## Development

```sh
bun install
bun run format
bun run build
bun run typecheck
bun run test
bun run format:check
bun run bench:self
bun run dev
```

`bun run dev` self-hosts with the complete built-in catalog. `bun run bench:self` reports the
minimum, median, and maximum whole-process runtime.

## Exit codes

- `0`: analysis completed, with or without violations.
- `2`: project discovery, TypeScript configuration, or another operational step failed.

## Non-goals

Better TypeScript is not a replacement for `tsc`, ESLint, or Prettier. It does not format code, load
third-party plugins, or provide per-rule configuration.
