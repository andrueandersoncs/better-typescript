---
name: better-typescript
description: Run Better TypeScript against the current TypeScript project and fix its NDJSON violations.
---

# Better TypeScript

Better TypeScript is a Go binary with a rule catalog. Each rule is a direct `typescript-go` AST/checker listener in `internal/rules/<rule_name>`.

## Get the binary

Install the npm package in the TypeScript project:

```sh
npm install --save-dev @better-typescript/better-typescript
```

For Better TypeScript development, build the current source with Go 1.26:

```sh
mise exec go@1.26 -- go build ./cmd/better-typescript
```

For repository changes, run `./scripts/check.sh`.

## Run

From the directory containing the root `tsconfig.json`, run the installed binary. Recursive project references are included:

```sh
npx better-typescript
```

No flags means all project files and all rules. Use project-relative file globs or rule names to narrow a run:

```sh
npx better-typescript --files 'src/**/*.ts'
npx better-typescript --rules no-throw,no-error-type
```

Repeat either flag or separate its values with commas. All rules are on by default. A root `better-typescript.json` contains ordered commands: matching `add_exclusions` commands turn named rules off, and matching `add_inclusions` commands turn them back on. `"rules": "*"` addresses every rule in that mode and must appear alone. Commands default to deterministic rules; `"mode": "semantic"` applies the same per-file selection. An explicit `--rules` skips configured commands for the invoked mode.

Status and operational errors go to stderr. Each stdout line is one NDJSON violation with `ruleName`, `level`, `message`, `filePath`, `line`, and `column`. Exit code `1` means an error-level violation or operational failure occurred. Exit code `0` and empty stdout mean the run is clean.

## Run semantic policies

Use the semantic subcommand only when asked to evaluate engineering policy against a working-tree change, committed Git range, selected current files, or all eligible current files:

```sh
export TYPESAFE_API_KEY="..."
npx better-typescript semantic
```

Run `npx better-typescript semantic --range 'origin/main...HEAD'` for complete changed files from a committed range endpoint, `--files 'src/**/*.ts'` for selected current files, or `--all` for every eligible current file. Add `--rules function-naming,readonly` to select policies. `--range`, `--files`, and `--all` are mutually exclusive. Range mode uses file contents and `better-typescript.json` from the end commit. Each applicable policy becomes one independent TypeSafe Noul question over the complete file. The policy file is inserted verbatim into the question. The TypeSafe provider chooses the default model unless `--model` overrides it. Use `--dry-run` to inspect files, policies, request partitions, and encoded bytes without an API call.

## Handle results

1. Parse every stdout line.
2. For a check request, report violations without editing.
3. For a fix request, apply the smallest behavior-preserving fixes.
   For Effect lifecycle, validation, identity, or timing changes, read `docs/engineering-principles.md` in the Better TypeScript checkout. Preserve those contracts when applying a diagnostic's guidance.
4. Run the project's formatter, type check, and tests.
5. Rerun `better-typescript` from the same directory.
6. Finish when stdout is empty or report the exact blocker.
