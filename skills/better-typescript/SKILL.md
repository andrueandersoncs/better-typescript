---
name: better-typescript
description: Run Better TypeScript against the current TypeScript project and fix its NDJSON violations.
---

# Better TypeScript

Better TypeScript is a Go binary with a fixed 129-rule catalog. Each rule is a direct `typescript-go` AST/checker listener in `internal/rules/<rule_name>`.

## Build from source

```sh
./scripts/initialize.sh
mise exec go@1.26 -- go build ./cmd/better-typescript
```

For repository changes, run `go fmt ./...`, `go vet ./...`, `go test ./...`, and `go build ./cmd/better-typescript` through `mise exec go@1.26 --`.

## Run

From the directory containing the root `tsconfig.json`, run the installed binary with no options. Recursive project references are included:

```sh
better-typescript
```

Status and operational errors go to stderr. Each stdout line is one NDJSON violation with `ruleName`, `level`, `message`, `filePath`, `line`, and `column`. Exit code `0` means analysis completed, even when violations exist. Empty stdout means the run is clean.

## Handle results

1. Parse every stdout line.
2. For a check request, report violations without editing.
3. For a fix request, apply the smallest behavior-preserving fixes.
4. Run the project's formatter, type check, and tests.
5. Rerun `better-typescript` from the same directory.
6. Finish when stdout is empty or report the exact blocker.
