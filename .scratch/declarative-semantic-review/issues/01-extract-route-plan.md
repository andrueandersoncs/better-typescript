# 01 — Extract the pure route plan

**Specification:** [Declarative semantic review](../spec.md)

Status: resolved

## What to build

Extract a pure, internal route-plan constructor from `routeRuleHunks`.

The plan must contain the complete known domain → path → hunk candidate tree, including recursive
bucket structure for oversized Choice sets. It is a declaration of possible routing work, not an
execution result.

Keep the interface concrete and package-private. Prefer one `routePlan` value and one
`buildRoutePlan(rule, diffFiles)` constructor over a general planning framework.

## Acceptance criteria

- [x] `buildRoutePlan` accepts only deterministic inputs and performs no evaluator, network,
      repository, clock, or environment access.
- [x] The plan contains every eligible domain, matching path, hunk, synthetic hunk, candidate id,
      description, and recursive bucket needed by current routing.
- [x] Source-scope filtering, glob matching, input ordering, and candidate descriptions preserve
      current behavior.
- [x] Plan data is inspectable without running an interpreter and contains no callbacks.
- [x] A narrow test proves the complete tree is built before any evaluator can run.
- [x] Existing routing execution remains in place for ticket 02; this ticket changes declaration,
      not behavior.
- [x] `./scripts/check.sh` passes.

## Non-goals

- Executing the plan.
- Changing routing choices, beam scoring, or request limits.
- Adding generic Applicative, Selective, or Monad interfaces.
- Exporting the plan outside `internal/semanticlint`.

## Answer

Implemented `routePlan`, `routeDomain`, `routePath`, `routeChoice`,
`routeChoiceOption`, `buildRoutePlan`, and `buildRouteChoice` in
`internal/semanticlint/routing.go`. `routeRuleHunks` now constructs the complete pure plan before
using the existing routing interpreter. `TestBuildRoutePlanDeclaresCompleteRecursiveTree` covers
recursive buckets, filtering, ordering, descriptions, real hunks, and synthetic hunks.

Behavior is preserved: routing choices, beam scoring, canonical order, decisions, usage, and errors
still use the existing execution path.

Verification:

- `go test ./internal/semanticlint -run '^(TestBuildRoutePlanDeclaresCompleteRecursiveTree|TestSemanticRoutingExcludesUnselectedFilesFromFinalJudgment|TestSemanticRoutingWithoutRepositoryEvidenceIsNotApplicable|TestNoneChoiceStopsBeforeRelevanceEvaluation|TestChoiceRoutingRecursesThroughLargeBucketSets)$' -count=1` — passed.
- `./scripts/check.sh` — passed.
