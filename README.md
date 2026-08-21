# Better TypeScript

Better TypeScript is a TypeScript linter for coding agents. It supports syntax- and type-based
rules, including semantic checks that syntax-only linters cannot express. It discovers a TypeScript
project and prints a flat list of actionable violations.

## Agent skills

```sh
npx skills add andrueandersoncs/better-typescript --skill better-typescript
npx skills add andrueandersoncs/better-typescript --skill triage-better-typescript
```

Use `better-typescript` for setup and normal runs. Use `triage-better-typescript` when code produced
by remediation is unsatisfactory and you can provide the result.

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
  "level": "error",
  "message": "Avoid throwing errors with throw. Return a typed error through Effect instead.",
  "filePath": "src/main.ts",
  "line": 4,
  "column": 3
}
```

Use `--pretty` for the same fields in human-readable form:

```text
src/main.ts:4:3 error no-throw Avoid throwing errors with throw. Return a typed error through Effect instead.
```

Operational status and project-loading failures go to stderr.

## Configuration

Add `better-typescript.config.ts` to the TypeScript project root when different files need different
rules:

```ts
import { defineConfig } from "@better-typescript/core/config"

export default defineConfig([
  {
    files: ["src/**/*.ts"],
    rules: { "*": "error" }
  },
  {
    files: ["src/legacy.ts"],
    rules: { "no-throw": "off" }
  },
  {
    files: ["src/boundary.ts"],
    rules: { "require-explicit-return-type": "warn" }
  }
])
```

File globs are matched against forward-slash paths relative to the project root. A configured
project starts with every rule disabled. Matching entries apply in declaration order, so later
entries override earlier entries. `"*"` changes every rule at that point, while an explicit rule
setting in the same entry takes precedence over `"*"`. `"error"` and `"warn"` enable a rule and set
the reported violation level; `"off"` disables it. Files that match no enabled rule are not linted.
Only root files selected by the TypeScript project's `files` or `include` are lint targets.
Transitive imports remain available for type-aware analysis but are not linted.

Rule identifiers must be unique kebab-case strings. Unknown configured rule names, invalid names,
and malformed config exports are operational errors. Without a config file, the CLI enables every
built-in rule for every project source file.

## Architecture

This Bun workspace has exactly three packages:

- `@better-typescript/core` owns project discovery, TypeScript Programs, `Rule`, `Violation`, and
  deterministic `lint` execution.
- `@better-typescript/rules` owns the 126 built-in rules and the deterministic `builtinRules`
  catalog.
- `@better-typescript/cli` owns argument parsing and violation rendering.

Dependencies point from CLI to core and rules, and from rules to core. Core never depends on the
built-in catalog.

There is no plugin graph, suppression, silent mode, aggregate report phase, or watch mode.
Configuration selects files and applies the `"error"`, `"warn"`, or `"off"` severity to registered
rules.

## Programmatic use

```ts
import { Effect } from "effect"
import { runAnalysis } from "@better-typescript/core/analysis"
import { builtinRules } from "@better-typescript/rules/builtinRules"

const { violations } = await Effect.runPromise(
  runAnalysis({ projectPath: ".", rules: builtinRules })
)
```

`loadProject` remains available for focused callers that need direct compiler Program access.

A custom rule has only a stable name and a source-file check:

```ts
import { NodeTarget, RuleFinding } from "@better-typescript/core/linter"
import type { Rule } from "@better-typescript/core/linter"

const noConsoleLog: Rule = {
  name: "acme-no-console-log",
  check: (context) => {
    const target = NodeTarget.make({ node: context.sourceFile })

    return [RuleFinding.make({ message: "Avoid console.log.", target })]
  }
}
```

Use `NodeTarget` when syntax owns the location. `PositionTarget` accepts an absolute, zero-based
integer offset within its `sourceFile`; core converts either target to one-based output coordinates.

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

Better TypeScript is not a replacement for `tsc`, ESLint, or Prettier. It does not format code or
load third-party plugins. Rule configuration controls enablement levels, not rule-specific options.
