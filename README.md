# Better TypeScript

Better TypeScript is a Go linter for TypeScript projects. It uses the pinned `typescript-go` compiler and runs 129 syntax- and type-aware rules in one AST pass per root source file.

## Build

```sh
./scripts/initialize.sh
mise exec go@1.26 -- go build ./cmd/better-typescript
```

The initialization command checks out the pinned `typescript-go` submodule, applies the required tsgolint patches, and prepares the compiler support code.

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
- `shim`, `patches`, and `typescript-go` are the pinned tsgolint compiler foundation.

See [`ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/rules.md`](docs/rules.md), and [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

## Development

```sh
mise exec go@1.26 -- go fmt ./...
mise exec go@1.26 -- go vet ./...
mise exec go@1.26 -- go test ./...
mise exec go@1.26 -- go build ./cmd/better-typescript
```
