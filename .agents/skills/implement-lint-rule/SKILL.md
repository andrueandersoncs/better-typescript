---
name: implement-lint-rule
description: Implement one defined Better TypeScript built-in Go lint rule using the closest existing rule packages as examples. Use when asked to implement a new lint rule in this repository.
compatibility: Requires repository access, Go 1.26 through mise, Bun, and fresh-context review.
---

# Implement Lint Rule

Implement one already-defined built-in rule on the current branch. Use
`plan-pattern-remediation` instead when the policy still needs to be chosen. Leave changes
uncommitted unless the user asks for a commit.

## Input

Accept a direct request or a local `.scratch/` spec or issue. It must define:

- the observable violation;
- the nearest allowed boundary; and
- the actionable replacement.

## Workflow

### 1. Fix the contract

Read `AGENTS.md`, `CONTEXT.md`, the request or linked local issue, relevant ADRs, and the worktree.
Search existing implementations, tests, and `docs/rules.md` for duplicate ownership. Fix the
kebab-case rule name, snake_case package name, exact predicate, report node or range, message, help,
and closest clean case. Ask only one remaining material policy question.

Complete this step when the rule has one non-overlapping behavior.

### 2. Choose current examples

Read `internal/rule/rule.go`, `internal/ruletest/ruletest.go`, `internal/rules/catalog.go`, and two or
three rule packages with the closest detector shape. Read each implementation, `_test.go`, and
`testdata/` together. Start with:

- `internal/rules/no_for_loops/` for syntax-only listeners;
- `internal/rules/no_error_type/` for checker-backed symbol identity;
- `internal/rules/no_unused/` for compiler diagnostics; and
- `internal/rules/speculative_export/` for cached project-wide evidence.

Treat current Go implementations as authoritative over historical TypeScript code. Prefer their
APIs and shapes. When no precedent exists, verify the needed pinned public `typescript-go` API
directly. Complete this step when every planned API, listener kind, report target, and fixture shape
is grounded in current source.

### 3. Write focused coverage first

Create `internal/rules/<snake_case_name>/rule_test.go` and minimal `testdata/`. Use
`ruletest.Assert` to assert every complete `analysis.Violation`: rule name, `error` level, combined
message and help, relative path, line, and column. Cover the smallest violation and nearest allowed
case. Add aliases, unrelated lookalikes, or tiny local declaration stubs only when identity needs
them.

Use a compiling scaffold for a behavioral red test when useful. A compile failure is not a red test.
Complete this step when the focused test fails only because the requested behavior is absent.

### 4. Implement and register

Keep the rule and its helpers in `internal/rules/<snake_case_name>/`. Return the narrowest
`rule.RuleListeners` map. Report with `ctx.ReportNode`, `ctx.ReportRange`, or
`ctx.ReportDiagnostic`. Use syntax guards first, then the pinned public `typescript-go` AST, checker,
and compiler adapters when identity or types matter. Use `rule.ProgramCacheValue` for immutable
program-wide evidence.

Preserve one listener registration and one aggregate AST traversal per file. Keep rule-specific
verdicts out of shared runtime code. Update compiler dependencies only through the documented
compiler-foundation workflow when separately approved.

Add the package import and rule value exactly once in `internal/rules/catalog.go`. Keep both sorted
by public rule name. Run `gofmt` and the focused package test until the exact contract passes.

### 5. Reconcile the catalog and public text

Update the sorted list in `docs/rules.md`.

Check `skills/better-typescript/SKILL.md` and `skills/triage-better-typescript/SKILL.md` after the
behavior change. Complete this step when package directories, catalog entries, tests, docs, and
counts describe the same complete, unique, sorted catalog.

### 6. Validate and review

Run:

```sh
mise exec go@1.26 -- go test ./internal/rules/<snake_case_name>
./scripts/check.sh
```

Inspect the final diff for unrelated edits, duplicate policy, extra traversals, text-only API
matching where symbol identity is required, stale catalog text, and missing clean boundaries. Have a
fresh reviewer compare the diff with the request and repository rules. Fix each finding and rerun
affected checks.

Complete this step when review and all checks pass.

## Result

Report the rule name, catalog disposition, changed files, focused coverage, full checks, and any
blocker. Keep the result concise.
