---
name: better-typescript
description: >
  Install, configure, and run Better TypeScript, the type-aware TypeScript linter for coding agents.
  Use when setting up Better TypeScript, checking or fixing a TypeScript project, interpreting its
  NDJSON violations, or explaining what the tool does.
---

# Better TypeScript

Better TypeScript is a TypeScript linter for coding agents. It loads a TypeScript Program and runs
both syntax- and type-based built-in rules, including semantic checks that syntax-only linters
cannot express. It returns a flat list of actionable violations. It complements `tsc`, ESLint, and
Prettier; it does not replace them or format code.

## Choose the task

- For an explanation, summarize the paragraph above and the output contract below. Do not edit the
  project.
- For setup, install and configure the CLI.
- For a check, run the CLI and report its NDJSON output without editing source.
- For a fix, run the CLI, remediate every violation, and rerun it.
- For post-remediation code the user rejects, use a Better TypeScript triage workflow instead of
  defending a clean run or reapplying the rejected transformation.

## Install

Better TypeScript requires Bun and an existing TypeScript project.

1. Confirm `bun --version` succeeds.
2. Install the scoped CLI package:

   ```sh
   bun add --dev @better-typescript/cli
   ```

3. When adding `better-typescript.config.ts`, also declare its imported API directly:

   ```sh
   bun add --dev @better-typescript/core
   ```

The unscoped npm package named `better-typescript` is a different project. Use
`@better-typescript/cli`.

## Configure

A project without `better-typescript.config.ts` runs every built-in rule against root files selected
by the TypeScript project's `files` or `include`. Transitive imports remain available for type-aware
analysis but are not linted. Add a config only when file scopes or rule levels must differ:

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

Globs use forward-slash paths relative to the project root. Config entries apply in order, so later
entries override earlier entries. In a configured project, every rule starts disabled. Enable the
catalog explicitly with `"*": "error"` or enable named rules. A named setting in an entry overrides
`"*"` in that entry.

## Run

Run from the project root:

```sh
bunx better-typescript --project .
```

Omit `--project` to use the current directory. Use `--glob 'src/**/*.ts'` to narrow analysis to
matching project-relative root files. Use repeatable `--rule` flags to check only named built-in
rules:

```sh
bunx better-typescript --rule no-throw --rule no-try-catch
```

When present, `--rule` ignores `better-typescript.config.ts` and reports selected rules as errors.
`--glob` still applies. Keep the default NDJSON output for agent use. Each stdout line is one
violation:

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

Status text and project-loading failures go to stderr. Exit code `0` means analysis completed, even
when stdout contains violations. Exit code `2` means an operational failure. Therefore, determine a
clean run from empty stdout, not only from the exit code. Use `--pretty` only when a human-readable
rendering is needed.

## Handle the result

1. Parse every stdout line as a violation.
2. For a check-only request, report the violations and do not edit source.
3. For a fix request, open each cited source and choose the smallest behavior-preserving fix from
   the rule name, message, and surrounding code.
4. Run the project's formatter, type check, and tests, then rerun the same Better TypeScript
   command.
5. Finish a fix only when stdout is empty or report the exact remaining violations and blocker.
