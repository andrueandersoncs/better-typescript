---
name: triage-better-typescript
description: Triage disliked TypeScript code produced while fixing Better TypeScript violations.
---

# Triage Better TypeScript Remediations

## Tool contract

Better TypeScript is a Go binary with direct `typescript-go` rules under `internal/rules/` and Markdown semantic policies (embedded plus `.better-typescript/rules/`). Run it from the directory containing `tsconfig.json`. All rules are on by default. Ordered `better-typescript.json` commands use matching `add_exclusions` to turn rules off and matching `add_inclusions` to turn them back on; `"rules": "*"` addresses the entire mode. Commands default to deterministic rules; `"mode": "semantic"` applies the same per-file selection to semantic policies. `--files` accepts project-relative globs. `--rules` accepts rule names and skips configured commands for the invoked mode. Both flags are repeatable or comma-separated. The deterministic CLI emits six-field NDJSON at `error` level, exits `1` on any violation or operational failure, and exits `0` when clean. `semantic` exits `1` for violations and `2` for errors.

Install with `npm install --save-dev @better-typescript/better-typescript`, or install a published tag with `go install github.com/andrueandersoncs/better-typescript/cmd/better-typescript@<version>`. Build the current source with `mise exec go@1.26 -- go build ./cmd/better-typescript`. Repository validation is `./scripts/check.sh`.

## Reconstruct

Collect the resulting code, user concern, original code or diff, and the NDJSON violations or semantic findings that prompted the edits. Map each changed construct to its rule and message. Record missing evidence.

## Evaluate

Check behavior, types, readability, names, indirection, casts, and rule interactions. A clean run proves only that no built-in rule reports a violation.

For Effect ownership, validation, equality, retries, or test timing, use `docs/engineering-principles.md` to distinguish application policy from runtime guarantees. A function name, nearby decoder, or imported clock is not evidence that the operation has the required semantics.

Classify each cause as agent remediation, rule guidance, rule interaction, detection context, configuration mismatch, or unresolved.

## Correct

Apply the smallest correction only when requested. Run focused project checks, then rerun `better-typescript` with the same flags from the project root. If the preferred code is reported again, keep that output as rule evidence instead of repeating the rejected edit.

Report the concern, before and after shapes, responsible violations, cause, correction, and verification.
