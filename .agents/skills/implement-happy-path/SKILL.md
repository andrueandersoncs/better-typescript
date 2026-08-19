---
name: implement-happy-path
description:
  Implement an approved plan exactly as written, then validate only its normal end-to-end path. Use
  when given an approved plan path and asked to implement the happy path without expanding scope or
  proposing options.
---

# Implement Happy Path

## Input

Require the path to an approved implementation plan. Read the plan and all applicable repository
instructions before editing. If the plan path is missing or inaccessible, ask for it; do not infer a
plan.

## Workflow

### 1. Implement the approved plan

Implement exactly the approved plan at the files and symbols it names.

- Do not add abstractions, indirection, generic infrastructure, or configuration unless the
  repository's existing architecture requires it for this exact path.
- Prefer reusing existing code when that is simpler than introducing another pattern.
- Delete code made obsolete by the direct cutover and update every affected caller.
- Do not ask the user to choose between implementation options. Resolve uncertainty from the
  repository, choose the simplest viable option, and proceed.
- Follow all mandatory repository instructions and applicable skills. They constrain implementation
  quality; they do not expand feature scope.

### 2. Verify the happy path

Verify only the requested happy path end to end.

- For a bug fix, reproduce the reported failure with the expected input, apply the fix, and confirm
  that input now succeeds.
- For a feature or change, exercise the normal path and observe the requested result.
- Run the repository's required validation commands.
- Add or update only the narrowest test needed to defend the requested observable behavior. Do not
  add edge-case coverage.

### 3. Report

Report:

1. the direct implementation;
2. the happy path exercised; and
3. validation results.

Do not propose optional follow-up work.
