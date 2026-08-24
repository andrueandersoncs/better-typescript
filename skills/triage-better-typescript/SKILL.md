---
name: triage-better-typescript
description: Triage disliked TypeScript code produced while fixing Better TypeScript violations.
---

# Triage Better TypeScript Remediations

## Tool contract

Better TypeScript is a Go binary with 129 direct `typescript-go` rules under `internal/rules/`. Build a source checkout with `./scripts/initialize.sh` and `mise exec go@1.26 -- go build ./cmd/better-typescript`. Run it with no options from the directory containing `tsconfig.json`. It emits deterministic six-field NDJSON at `error` level and exits successfully after completed analysis. Repository validation is `go fmt ./...`, `go vet ./...`, `go test ./...`, and `go build ./cmd/better-typescript` through Go 1.26.

## Reconstruct

Collect the resulting code, user concern, original code or diff, and the NDJSON violations that prompted the edits. Map each changed construct to its rule and message. Record missing evidence.

## Evaluate

Check behavior, types, readability, names, indirection, casts, and rule interactions. A clean run proves only that no built-in rule reports a violation.

Classify each cause as agent remediation, rule guidance, rule interaction, detection context, configuration mismatch, or unresolved.

## Correct

Apply the smallest correction only when requested. Run focused project checks, then rerun the no-option `better-typescript` command from the project root. If the preferred code is reported again, keep that output as rule evidence instead of repeating the rejected edit.

Report the concern, before and after shapes, responsible violations, cause, correction, and verification.
