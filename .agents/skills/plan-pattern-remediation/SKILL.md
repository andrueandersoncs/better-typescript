---
name: plan-pattern-remediation
description:
  Use when asked to plan a Better TypeScript rule, configuration, or local pattern remediation
  without implementing it.
---

# Plan Pattern Remediation

Throughout this skill, `$ARGUMENTS` means the user's request that invoked the skill.

Turn the following maintainer observation into a concrete Better TypeScript remediation plan:

$ARGUMENTS

This is a planning command. Do not implement the plan or change the repository.

## Goal

Start from: “I do not like this code pattern in code Better TypeScript was applied to.” End with a
small, reviewable plan that chooses deliberately among:

- adding a rule;
- updating a rule;
- deleting or merging rules;
- changing project configuration; or
- refactoring only the observed code.

## 1. Establish the candidate policy

Turn the observation into a precise proposed invariant. Capture:

- a minimal example of the disliked pattern;
- the desired replacement or desired code shape;
- why it is undesirable;
- the closest similar examples that must remain allowed;

If the input does not contain enough information to state the invariant, inspect the cited code
first. Ask only for the remaining material decision; do not invent a policy boundary.

## 2. Locate the owning behavior

Read `AGENTS.md`, `CONTEXT.md`, `internal/rules/catalog.go`, `docs/rules.md`, and the closest existing
rule docs. Search `internal/rules/` by domain concept, public rule name, message, and help text. Read
two or three closest rule implementations together with their `_test.go` and `testdata/` coverage.

Determine whether the behavior is:

- already owned by one built-in rule;
- a missing boundary of the closest rule;
- duplicated across rules;
- a stable new repository-wide policy;
- a project-specific selection concern for `better-typescript.json`; or
- a local implementation concern that should not become a linter rule.

Audit overlap against the full catalog. Compare executable predicates, report targets, messages,
tests, and clean boundaries rather than names alone. Complete this step when one existing or proposed
owner has a non-overlapping responsibility.

## 3. Choose one remediation shape

Use this decision table and state the reason for the choice:

| Finding                                                                                              | Chosen action                                                    |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| The pattern is one local implementation and has no stable, reusable boundary.                        | Refactor the code; do not add a rule.                            |
| An existing rule owns the policy but matches too broadly, narrowly, or unclearly.                    | Update that rule and its boundary coverage.                      |
| The pattern is stable, broadly useful, mechanically recognizable, and has an actionable replacement. | Add one narrowly scoped rule.                                    |
| Two rules express the same policy or one is obsolete.                                                | Merge or delete the obsolete rule and migrate intended coverage. |
| The policy belongs only to selected files or one consumer project.                                   | Use ordered `better-typescript.json` commands.                   |

A built-in rule must have a clear rationale, a predictable boundary, and actionable help. Otherwise,
prefer a refactor or an investigation plan.

## 4. Specify executable acceptance criteria

Plan compiling fixtures under `internal/rules/<snake_case_name>/testdata/`. Include the smallest
violation, the nearest clean boundary, and extra files only when module or symbol context requires
them.

Specify every expected `analysis.Violation`: rule name, `error` level, combined message and help,
relative file path, line, and column. The focused `_test.go` must use `ruletest.Assert` to assert the
complete violation set. Add aliases, unrelated lookalikes, and pairwise overlap cases only when the
predicate needs them.

## 5. Write the file-level implementation plan

For each action, name the expected files and responsibility:

- **Add a rule:** implementation, `_test.go`, and `testdata/` under
  `internal/rules/<snake_case_name>/`; sorted import and rule value in `internal/rules/catalog.go`;
  `docs/rules.md`; `docs/rules/<kebab-case-name>.md`; and affected public skills.
- **Update a rule:** change only the owning package behavior, focused coverage, and public text
  required by the policy boundary.
- **Delete or merge:** remove the obsolete package, catalog entries, tests, fixtures, and rule docs;
  move retained coverage to the surviving rule.
- **Configure selection:** plan ordered `better-typescript.json` commands with explicit file and rule
  selectors; do not change the built-in catalog.
- **Refactor locally:** name only the consumer code and its existing tests; do not add a linter rule.

Audit public behavior explicitly. A rule's name, message, help, report location, and default-enabled
status are compatibility decisions. Plan only the changes required by the chosen policy.

## 6. Define verification and handoff

For rule changes, list verification in this order:

1. `mise exec go@1.26 -- go test ./internal/rules/<snake_case_name>`.
2. `./scripts/check.sh`.
3. Final diff inspection for unrelated edits, duplicate ownership, stale catalog or docs, and extra
   listener registrations or traversals.

For configuration or local-refactor plans, use the narrowest current consumer checks plus any
repository-required full check. Leave changes uncommitted unless the maintainer asks for a commit.

## Required response format

Return a concise plan with exactly these sections:

```text
## Policy decision

## Evidence and boundaries

## Chosen remediation

## Planned changes

## Regression coverage

## Compatibility and non-goals

## Verification

## Open decisions
```

Be concrete about names, source files, tests, and acceptance criteria. If the evidence supports a
refactor rather than a linter change, say so plainly.
