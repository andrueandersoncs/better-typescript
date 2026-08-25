# Better TypeScript

Better TypeScript is a Go linter for TypeScript projects. It uses a pinned public `typescript-go` compiler module and runs 129 syntax- and type-aware rules in one AST pass per root source file.

## Prerequisites

- Git
- bash
- mise
- Bun 1.3.0
- Node.js 18 or newer with npm
- Network access for Go and package downloads

The project intentionally uses the latest Go 1.26 patch selected by mise.

## Build

A source checkout is a normal Go module. Build it directly:

```sh
mise exec go@1.26 -- go build ./cmd/better-typescript
```

The command writes `./better-typescript`.

## Install

Install the npm package in a TypeScript project:

```sh
npm install --save-dev @better-typescript/better-typescript
npx better-typescript
```

Alternatively, install a published tag with Go:

```sh
go install github.com/andrueandersoncs/better-typescript/cmd/better-typescript@<version>
```

## Run

Run the binary from a directory containing `tsconfig.json`:

```sh
/path/to/better-typescript
```

With no flags or configuration, the command checks all project files with all rules. Restrict files with project-relative globs:

```sh
/path/to/better-typescript --files 'src/**/*.ts'
```

Restrict rules by name:

```sh
/path/to/better-typescript --rules no-throw
/path/to/better-typescript --rules no-throw,no-error-type
```

Repeat either flag or separate its values with commas. Quote globs so the CLI expands them instead of the shell.

### Configuration

Add `better-typescript.json` to the project root to select rules by file:

```json
{
  "overrides": [
    { "files": "src/**/*.ts", "rules": "no-throw" },
    {
      "files": "src/**/*.test.ts",
      "rules": ["no-throw", "no-error-type"]
    }
  ]
}
```

All rules are the default. Each matching entry replaces the rule set for that file. Entries run in order, so a later match overrides an earlier match. An empty rule list disables checks for matching files. Globs are relative to the project root.

`--files` limits which configured files are analyzed. An explicit `--rules` value applies those rules to every selected file and ignores `better-typescript.json`.

The command writes `Analyzing <absolute current directory>.` to stderr. It writes one violation per stdout line as NDJSON:

```json
{"ruleName":"no-throw","level":"error","message":"Avoid throwing errors with throw. Return a typed error through Effect instead.","filePath":"src/main.ts","line":4,"column":3}
```

Paths are current-directory-relative slash paths. Locations are one-based UTF-16 positions. Output is exactly deduplicated and deterministic. A completed analysis exits successfully even when violations exist.

Selected rules use `error` level. Unknown rule names and invalid configuration fail before analysis. There is no plugin API or JavaScript API.

## Architecture

- `cmd/better-typescript` owns CLI flag parsing, rule selection, and NDJSON rendering.
- `internal/analysis` loads `./tsconfig.json` and its recursive project references, then runs one `typescript-go` Program per config.
- `internal/linter` registers all rule listeners once per file and dispatches them in one traversal using checker workers.
- `internal/rules/<rule_name>` owns each rule and its `testdata` project.
- `internal/rules/catalog.go` registers all 129 rules once in sorted name order.
- `github.com/andrueandersoncs/typescript-go` supplies the public compiler adapters.

See [`ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/compiler-foundation.md`](docs/compiler-foundation.md), [`docs/rules.md`](docs/rules.md), and [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

## Development

Run the local gate:

```sh
./scripts/check.sh
```

Update the compiler dependency with:

```sh
./scripts/update-typescript-go.sh <version>
```
