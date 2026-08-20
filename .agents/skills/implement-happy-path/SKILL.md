---
name: implement-happy-path
description: Implement an approved plan exactly as written, then validate only its normal end-to-end path. Use when given an approved plan path and asked to implement the happy path without expanding scope or proposing options.
---

# Implement Happy Path

Implement an approved plan and validate its normal path; do not plan the change or expand its scope.

## Inputs

1. **Approved plan:** The repository-relative or absolute path to the approved implementation plan.
2. **Repository context:** Applicable instructions, code, commands, and reported behavior supplied by the user or discovered from the repository.

## Outputs

1. **Happy-path implementation result:** Repository changes that implement the approved plan, defended by only the narrowest necessary test, plus a report of the direct implementation, exercised happy path, and validation results; complete when the normal path succeeds and required validation passes.

## Procedure

### 1. Resolve the approved plan and repository rules.

**Inputs:**

    a. Approved plan.
    b. Repository context.

**Constraints:**

    a. Require an accessible approved plan path; when it is missing or inaccessible, ask for it and stop without inferring a plan.
    b. Read the complete plan and all applicable repository instructions before editing.
    c. Identify the named files, symbols, normal path, and required validation commands.

**Outputs:**

    a. Concrete implementation scope or one blocking plan-path question.

### 2. Establish the bug baseline when applicable.

**Inputs:**

    a. Concrete implementation scope.
    b. Reported behavior.

**Constraints:**

    a. For a bug fix, reproduce the reported failure with the expected input before editing.
    b. For a feature or change, record the baseline as not applicable and continue.

**Outputs:**

    a. Reproduced bug failure or not-applicable baseline.

### 3. Implement the approved plan directly.

**Inputs:**

    a. Concrete implementation scope.
    b. Repository instructions.
    c. Baseline result.

**Constraints:**

    a. Implement exactly the plan at the files and symbols it names.
    b. Reuse existing code when simpler than introducing another pattern.
    c. Add abstractions, indirection, infrastructure, or configuration only when the existing architecture requires it for this path.
    d. Delete code made obsolete by the direct cutover and update every affected caller.
    e. Resolve uncertainty from the repository, choose the simplest viable option, and proceed without asking the user to choose.
    f. Treat mandatory repository instructions and applicable skills as quality constraints, not expanded feature scope.

**Outputs:**

    a. Repository state implementing the approved plan.

### 4. Verify only the happy path.

**Inputs:**

    a. Implemented repository state.
    b. Normal path.
    c. Required validation commands.

**Constraints:**

    a. For a bug fix, rerun the reproduced input and confirm it now succeeds.
    b. For a feature or change, exercise the normal path and observe the requested result.
    c. Add or update only the narrowest test needed to defend the requested observable behavior.
    d. Run the repository's required validation commands.
    e. Do not add edge-case coverage.

**Outputs:**

    a. Happy-path evidence and required validation results.

### 5. Report the result.

**Inputs:**

    a. Implemented repository state.
    b. Happy-path evidence.
    c. Required validation results.

**Constraints:**

    a. Report the direct implementation, the happy path exercised, and the validation results.
    b. Do not propose optional follow-up work.
    c. If the normal path fails or required validation does not pass, report that result without claiming completion; otherwise report completion.

**Outputs:**

    a. Final happy-path implementation status report; complete only when the normal path succeeds and required validation passes.
