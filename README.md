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
npm install --save-dev @andrueandersoncs/better-typescript
npx better-typescript
```

Alternatively, install a published tag with Go:

```sh
go install github.com/andrueandersoncs/better-typescript/cmd/better-typescript@<version>
```

## Run

Run the binary with no options from a directory containing `tsconfig.json`:

```sh
/path/to/better-typescript
```

The command writes `Analyzing <absolute current directory>.` to stderr. It writes one violation per stdout line as NDJSON:

```json
{"ruleName":"no-throw","level":"error","message":"Avoid throwing errors with throw. Return a typed error through Effect instead.","filePath":"src/main.ts","line":4,"column":3}
```

Paths are current-directory-relative slash paths. Locations are one-based UTF-16 positions. Output is exactly deduplicated and deterministic. A completed analysis exits successfully even when violations exist.

The full fixed catalog is enabled at `error` level. There are no CLI options, project configuration, plugin API, or JavaScript API.

## Architecture

- `cmd/better-typescript` owns the no-option CLI and NDJSON rendering.
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
