# 02 — Interpret the route plan selectively

**Specification:** [Declarative semantic review](../spec.md)

Status: resolved

Blocked by: 01

## What to build

Add the interpreter for the concrete route plan from ticket 01 and make `routeRuleHunks` use it.

The interpreter may conditionally evaluate known child branches, but it must not construct new route
branches from returned answers. Parent answers select among branches already present in the plan.

Remove the superseded request-construction path after the cutover.

## Acceptance criteria

- [x] The interpreter receives `context.Context`, a complete route plan, model selection, and the
      existing evaluator dependency.
- [x] Domain, path, hunk, and recursive bucket execution consume only nodes already in the plan.
- [x] `none` choices, multi-candidate retention, joined probabilities, beam width, decision records,
      usage aggregation, and errors preserve current behavior.
- [x] Existing selected hunks and routing decisions remain deterministic and canonically ordered.
- [x] A narrow test proves an unselected branch is declared but not interpreted.
- [x] Existing routing behavior tests continue to pass without weaker assertions.
- [x] Obsolete mixed declaration/execution helpers are removed.
- [x] `./scripts/check.sh` passes.

## Non-goals

- Relevance judgments or final policy evaluation.
- Speculative execution of every route branch.
- Public plan serialization.
- A general Selective abstraction.

## Answer

Implemented `interpretRoutePlan`, `interpretRouteChoice`, and `interpretRouteChoiceLevel` in
`internal/semanticlint/routing.go`. `routeRuleHunks` now builds the complete `routePlan` and passes
it to the interpreter. The old `routeOption`, `routeOptions`, `routeOptionsAny`, and `askChoice`
mixed declaration/execution path was removed.

Routing behavior is preserved: declared nodes govern conditional descent, while `none` handling,
multi-candidate retention, joined probabilities, beam width, decisions, ordering, usage, request
size handling, and errors retain their existing semantics.

Verification:

- `go test ./internal/semanticlint -run '^(TestChoiceRoutingBoundsEscapedDescriptions|TestBuildRoutePlanDeclaresCompleteRecursiveTree|TestInterpretRoutePlanSkipsUnselectedDeclaredBranch|TestChoiceRoutingRecursesThroughLargeBucketSets|TestOversizedChoiceStopsWithoutEvaluation|TestSemanticRoutingExcludesUnselectedFilesFromFinalJudgment|TestSemanticRoutingWithoutRepositoryEvidenceIsNotApplicable|TestNoneChoiceStopsBeforeRelevanceEvaluation)$' -count=1` — passed.
- `./scripts/check.sh` — passed.
