---
name: absurd-code-review
description: Analyzes bounded code for absurd or questionable parts, steelmans why each should stay, and produces an evidence-adjudicated read-only report. Use when asked to challenge, investigate, or review absurd, dubious, suspicious, overcomplicated, or questionable code in a project, repository, directory, file, snippet, diff, commit, branch, or PR.
compatibility: Requires fresh-subagent delegation and research capability; uses project tests or measurements when they can distinguish the arguments.
---

This skill reviews bounded code read-only and reports evidence-adjudicated conclusions.

Run every numbered task in this skill in a new, fresh subagent. Bind every declared `Input` to its value, including required prior-task outputs, replace each `$variable-name` in the task text, and pass the entire rendered task—title, task text, resolved `Inputs`, `Constraints`, and expected `Outputs`—to the subagent.

## Inputs

1. **Code scope:** Any bounded, resolvable project, repository, directory, file, snippet, diff, commit, branch, or PR.
2. **Review context (optional):** Goals, constraints, documentation, links, prior analysis, or preferred report destination.
3. **Evidence aids (optional):** Tests, benchmarks, reproduction steps, environments, commands, or measurements.

## Outputs

1. **Absurd Code Review Report:** Exactly one report at the requested destination or inline, tied to the current scope fingerprint or an `unavailable` sentinel and marked complete or incomplete. It contains Stage 1 stable Part IDs and locations with strongest remove/refactor arguments; Stage 2 the identical parts, order, and cardinality with strongest keep-as-is arguments; and Stage 3 the identical parts, order, and cardinality with exactly one independently supported winner and a detailed, traceable evidence log per part. It is complete only when scope and source fidelity, a current baseline, cross-stage alignment, independent adjudication, one winner per part, traceability, and final validation pass; unresolvable scope yields one incomplete report with empty stages.

## Tasks

### Task 1: Resolve and fingerprint the review scope

Resolve `$code-scope` into a bounded source snapshot, use `$review-context` to capture goals, constraints, sources, and report destination, and use `$evidence-aids` to record available commands, environments, tests, benchmarks, and measurements. Produce a `scope-resolution-record` with scope, preserved source reference, status, context, evidence aids, and either a reproducible fingerprint or `fingerprint: unavailable`; if resolution fails, record the incomplete reason and an empty part set. This task is complete when the record either identifies one reproducible baseline or explicitly marks the scope unresolved.

**Inputs:**

- `code-scope`: Initial bounded code reference.
- `review-context`: Optional goals, constraints, sources, prior analysis, and destination.
- `evidence-aids`: Optional commands, tests, benchmarks, environments, and measurements.

**Constraints:**

    a. Bound all inspection to the resolved scope and preserve its source unchanged.
    b. Fingerprint the exact reviewed baseline using the most precise available commit, diff, tree, file, snippet, and content identifiers.
    c. Treat unresolved scope as a valid incomplete branch rather than inventing source or parts.

**Outputs:**

    a. `scope-resolution-record`: Scope, source, fingerprint, status, context, evidence aids, and any unresolved reason.

### Task 2: Produce Stage 1 challenge

Using `$scope-resolution-record` only, inspect the fingerprinted source and produce `stage-one-record`: identify each questionable or absurd part, assign a stable Part ID and precise location, preserve a fixed order, and make the strongest good-faith argument for removing or refactoring it. Include the relevant source basis and claim traceability; if scope status is unresolved, emit an empty Stage 1. This task is complete when every selected part has one stable identity/location and one strongest remove/refactor argument, or the list is explicitly empty.

**Inputs:**

- `scope-resolution-record`: Resolved baseline and review boundaries from Task 1.

**Constraints:**

    a. Analyze only the recorded source and fingerprint without editing it.
    b. Make each challenge specific, substantive, and tied to observed code.
    c. Preserve Part IDs, locations, order, and cardinality as the alignment baseline for later stages.

**Outputs:**

    a. `stage-one-record`: Fingerprint, status, and ordered parts with stable identity/location, strongest remove/refactor argument, and source traceability.

### Task 3: Produce Stage 2 steelman

Using `$scope-resolution-record` and `$stage-one-record`, research the recorded code, tests, history, documentation, and relevant sources, then produce `stage-two-record` for the exact same Part IDs, locations, order, and cardinality with the strongest good-faith keep-as-is argument for every part without weakening Stage 1. When Stage 1 is empty, emit a matching empty Stage 2. This task is complete when every Stage 1 part has exactly one aligned strongest keep-as-is argument and no part has been added, removed, renamed, relocated, or reordered.

**Inputs:**

- `scope-resolution-record`: Resolved baseline and review boundaries from Task 1.
- `stage-one-record`: Ordered challenge parts from Task 2.

**Constraints:**

    a. Preserve the recorded source and fingerprint without edits.
    b. Steelman actual design intent, constraints, and behavior in strongest good faith.
    c. Keep exact cross-stage Part IDs, locations, order, and cardinality.

**Outputs:**

    a. `stage-two-record`: Fingerprint, status, and aligned ordered parts with strongest keep-as-is arguments and source traceability.

### Task 4: Produce Stage 3 independent adjudication

Using `$scope-resolution-record`, `$stage-one-record`, and `$stage-two-record`, emit an empty aligned `stage-three-record` without research or tests when scope status is unresolved. Otherwise, first recheck the baseline fingerprint; if it changed, emit a `baseline-refresh-signal` with evidence and stop so the caller can rerun Tasks 1–4 in new fresh subagents before assembly. On a current baseline, independently research relevant sources, verify material claims and record the evidence and resulting conclusions, and select discriminating tests or measurements for each aligned part. Record each method, result, and interpretation, or why testing would not discriminate and adjudicate from verified evidence; then produce `stage-three-record` in the same part order with exactly one winning argument and rationale plus a detailed evidence log per part. This task is complete when it emits either a justified refresh signal or one independently supported winner and evidence log for every part, including a valid empty set.

**Inputs:**

- `scope-resolution-record`: Resolved baseline, context, sources, fingerprint, and evidence aids from Task 1.
- `stage-one-record`: Ordered remove/refactor arguments from Task 2.
- `stage-two-record`: Aligned keep-as-is arguments from Task 3.

**Constraints:**

    a. Adjudicate independently rather than treating either prior stage as authoritative.
    b. Keep the same fingerprint, Part IDs, locations, order, and cardinality across all three stages.
    c. Use bounded read-only research, claim verification, and project tests or measurements; preserve source unchanged.
    d. Give exactly one winner per part and trace every source, verified claim, test, result, interpretation, and rationale.

**Outputs:**

    a. `stage-three-record` or `baseline-refresh-signal`: Current fingerprint and aligned winners with detailed evidence logs, an empty aligned set, or evidence requiring refresh.

### Task 5: Assemble and validate the report

Using `$scope-resolution-record`, `$stage-one-record`, `$stage-two-record`, and `$stage-three-record`, validate source and fingerprint fidelity, exact cross-stage Part ID/location/order/cardinality alignment, both arguments, independent evidence, one winner and detailed evidence log per part, status, traceability, and all completion conditions, then emit exactly one Absurd Code Review Report at the requested destination or inline. A resolved scope requires a current matching baseline; an unresolved scope produces one incomplete report with `fingerprint: unavailable` and empty stages. This task is complete when exactly one validated report is emitted.

**Inputs:**

- `scope-resolution-record`: Scope, source, current fingerprint, status, context, and destination from Task 1.
- `stage-one-record`: Ordered Stage 1 parts and remove/refactor arguments from Task 2.
- `stage-two-record`: Aligned Stage 2 keep-as-is arguments from Task 3.
- `stage-three-record`: Aligned Stage 3 winners and evidence logs from Task 4 after any required refresh.

**Constraints:**

    a. Emit only the single user-visible report; internal records remain handoffs.
    b. Include sources and material-claim evidence and conclusions; test or measurement method, result, and interpretation or reason it would not discriminate; winner and rationale; and any incomplete reason.
    c. Reject assembly on a changed fingerprint so the caller reruns Tasks 1–4 in new fresh subagents before invoking this task again.
    d. Validate every completion condition without editing reviewed source.

**Outputs:**

    a. Exactly one Absurd Code Review Report at the requested destination or inline.
