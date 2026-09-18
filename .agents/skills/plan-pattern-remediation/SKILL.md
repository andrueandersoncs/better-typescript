---
name: plan-pattern-remediation
description:
  Use when asked to plan a Better TypeScript deterministic rule, semantic policy, configuration, or
  local pattern remediation without implementing it.
---

# Plan Pattern Remediation

Throughout this skill, `$ARGUMENTS` means the user's request that invoked the skill.

Turn the following maintainer observation into a concrete Better TypeScript remediation plan:

$ARGUMENTS

This is a planning command. Do not implement the plan or change the repository.

## Goal

Start from: “I do not like this code pattern in code Better TypeScript was applied to.” End with a
small, reviewable plan that chooses deliberately among:

- adding or updating a deterministic built-in Go rule;
- adding or updating an embedded semantic policy;
- deleting or merging existing rules or policies;
- changing deterministic or semantic project configuration; or
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

Read `AGENTS.md`, `CONTEXT.md`, `internal/rules/catalog.go`, `docs/rules.md`,
`docs/semantic-lint.md`, and the closest existing rule or policy docs. Search both
`internal/rules/` and `internal/semanticlint/defaults/` by domain concept, public name, message,
help text, and policy language. For deterministic candidates, read two or three closest rule
implementations with their `_test.go` and `testdata/` coverage. For semantic candidates, read the
closest default policies with the relevant `internal/semanticlint/` routing, metadata, tests, and
fixtures.

Determine whether the behavior is:

- already owned by one deterministic built-in rule;
- already owned by one embedded semantic policy;
- a missing boundary of the closest owner;
- duplicated across deterministic and semantic catalogs;
- a stable new repository-wide policy;
- a project-specific selection or semantic-policy concern; or
- a local implementation concern that should not become lint policy.

Audit overlap across both catalogs. Compare exact predicates, semantic definitions, globs, scope,
required evidence, report targets, messages, tests, and clean boundaries rather than names alone.
Complete this step when one existing or proposed owner has a non-overlapping responsibility.

## 3. Choose one remediation shape

Use this decision table and state the reason for the choice:

| Finding | Chosen action |
| --- | --- |
| The pattern is one local implementation and has no stable, reusable boundary. | Refactor the code; do not add lint policy. |
| An existing deterministic rule owns an exact policy but matches too broadly, narrowly, or unclearly. | Update that Go rule and its boundary coverage. |
| An existing semantic policy owns the judgment but its wording, globs, scope, or evidence are wrong. | Update that policy and focused semantic-lint coverage. |
| The policy is stable, broadly useful, mechanically recognizable, and has an actionable replacement. | Add one narrowly scoped deterministic Go rule. |
| The policy is stable and broadly useful but requires contextual judgment from bounded source, repository, change, or review evidence. | Add one Markdown policy under `internal/semanticlint/defaults/`. |
| Two owners express the same policy or one is obsolete. | Merge or delete the obsolete owner and migrate intended coverage. |
| A contextual policy belongs to one consumer project. | Add it under that project's `.better-typescript/rules/`. |
| Deterministic enforcement belongs only to selected files or one consumer project. | Use ordered `better-typescript.json` commands. |

Prefer a deterministic rule when the boundary can be expressed exactly with the AST, checker, or
repository state. Prefer semantic lint when the irreducible decision is contextual and the available
bounded evidence can support it. An embedded policy must also be reusable across repositories,
concise enough to judge consistently, and safe for TypeSafe evaluation. Otherwise, prefer a project
policy, refactor, or investigation plan.

## 4. Specify executable acceptance criteria

For a deterministic rule, plan compiling fixtures under
`internal/rules/<snake_case_name>/testdata/`. Include the smallest violation, the nearest clean
boundary, and extra files only when module or symbol context requires them. Specify every expected
`analysis.Violation`: rule name, `error` level, combined message and help, relative file path, line,
and column. The focused `_test.go` must use `ruletest.Assert` to assert the complete violation set.

For a semantic policy, specify its exact Markdown title, invariant, actionable replacement, globs,
evaluator scope, and required evidence. Include the smallest violating example, the nearest clean
example, and the insufficient-evidence boundary. Plan focused `internal/semanticlint/` test and
`testdata/` coverage for discovery, explicit selection, glob applicability, scope, and evidence
requirements without turning a probabilistic judgment into a brittle exact-text assertion.

Add aliases, unrelated lookalikes, and pairwise overlap cases only when the selected boundary needs
them.

## 5. Write the file-level implementation plan

For each action, name the expected files and responsibility:

- **Add a deterministic rule:** implementation, `_test.go`, and `testdata/` under
  `internal/rules/<snake_case_name>/`; sorted import and rule value in `internal/rules/catalog.go`;
  `docs/rules.md`; `docs/rules/<kebab-case-name>.md`; and affected public skills.
- **Add an embedded semantic policy:** one Markdown file in the narrowest matching
  `internal/semanticlint/defaults/` domain; `internal/semanticlint/rules.go` only when scope,
  evaluator, or evidence metadata must change; focused `internal/semanticlint/semanticlint_test.go`
  and `testdata/` coverage; `docs/semantic-lint.md` and affected skills only when their public
  contract changes.
- **Update an owner:** change only the owning deterministic package or semantic policy, focused
  coverage, and public text required by the policy boundary.
- **Delete or merge:** remove the obsolete package or policy, catalog or metadata entries, tests,
  fixtures, and docs; move retained coverage to the surviving owner.
- **Configure deterministic selection:** plan ordered `better-typescript.json` commands with
  explicit file and rule selectors; do not change either built-in catalog.
- **Add a project semantic policy:** plan its Markdown file under `.better-typescript/rules/` with
  explicit globs; do not change the embedded defaults.
- **Refactor locally:** name only the consumer code and its existing tests; do not add lint policy.

Audit public behavior explicitly. Deterministic names, messages, help, report locations, and
default-enabled status are compatibility decisions. Semantic selectors, titles, definitions, globs,
scope, evaluator, and evidence requirements are compatibility decisions. Plan only the changes
required by the chosen policy.

## 6. Define verification and handoff

For deterministic rule changes, list verification in this order:

1. `mise exec go@1.26 -- go test ./internal/rules/<snake_case_name>`.
2. `./scripts/check.sh`.
3. Final diff inspection for unrelated edits, duplicate ownership, stale catalog or docs, and extra
   listener registrations or traversals.

For embedded semantic policy changes, list verification in this order:

1. `mise exec go@1.26 -- go test ./internal/semanticlint`.
2. A `better-typescript semantic --dry-run` invocation selecting the exact policy and representative
   files without an API call.
3. `./scripts/check.sh`.
4. Final diff inspection for unrelated edits, duplicate ownership, stale metadata or docs, and
   overly broad globs or evidence requirements.

For configuration, project-policy, or local-refactor plans, use the narrowest current consumer checks
plus any repository-required full check. Leave changes uncommitted unless the maintainer asks for a
commit.

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
