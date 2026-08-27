---
name: triage-better-typescript
description: Triage disliked TypeScript code produced while fixing Better TypeScript violations.
---

# Triage Better TypeScript Remediations

## Tool contract

Better TypeScript is a Go binary with direct `typescript-go` rules under `internal/rules/`. Run it from the directory containing `tsconfig.json`. No flags checks all project files with all rules unless `better-typescript.json` contains ordered per-file `add_inclusions` or `add_exclusions` commands. `--files` accepts project-relative globs. `--rules` accepts rule names and ignores the configuration. Both flags are repeatable or comma-separated. The CLI emits deterministic six-field NDJSON at `error` level and exits successfully after completed analysis.

Install a published tag with `go install github.com/andrueandersoncs/better-typescript/cmd/better-typescript@<version>`. The current checkout is untagged, so build it with `mise exec go@1.26 -- go build ./cmd/better-typescript`. Repository validation is `./scripts/check.sh`.

## Reconstruct

Collect the resulting code, user concern, original code or diff, and the NDJSON violations that prompted the edits. Map each changed construct to its rule and message. Record missing evidence.

## Evaluate

Check behavior, types, readability, names, indirection, casts, and rule interactions. A clean run proves only that no built-in rule reports a violation.

Classify each cause as agent remediation, rule guidance, rule interaction, detection context, configuration mismatch, or unresolved.

## Correct

Apply the smallest correction only when requested. Run focused project checks, then rerun `better-typescript` with the same flags from the project root. If the preferred code is reported again, keep that output as rule evidence instead of repeating the rejected edit.

Report the concern, before and after shapes, responsible violations, cause, correction, and verification.
