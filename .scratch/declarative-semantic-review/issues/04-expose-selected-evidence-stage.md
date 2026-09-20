# 04 — Expose the selected-evidence stage

**Specification:** [Declarative semantic review](../spec.md)

Status: resolved

Blocked by: 03

## What to build

Make the essential result-shaped dependency explicit in `evaluateSemanticRule`.

Introduce a concrete selected-evidence value produced by pure relevance policy. Build the final
judgment plan only from that value. The orchestration must visibly cross this stage instead of
hiding it in a callback, closure, or general `Bind` operation.

The final judgment remains one Noul over the exact selected changed and supporting evidence.

## Acceptance criteria

- [x] A package-private selected-evidence type distinguishes selected evidence from candidates and
      scored evidence.
- [x] Pure policy owns relevance thresholding, ranking, maximum selection, and changed-evidence
      presence.
- [x] Final-plan construction accepts selected evidence directly and cannot run before selection.
- [x] `not_applicable` remains the explicit outcome when selected evidence contains no changed
      candidate; no final judgment is evaluated.
- [x] Final state preserves the changed/supporting split and excludes unselected evidence.
- [x] Probability classification and finding messages preserve current behavior.
- [x] `evaluateSemanticRule` reads as named stage composition with no hidden result-shaped callback.
- [x] The narrow final-request and no-applicable-evidence tests cover the stage seam.
- [x] `./scripts/check.sh` passes.

## Non-goals

- Enumerating possible evidence subsets.
- A general Monad or `Bind` interface.
- Changing classification thresholds or finding output.
- Exporting stage types.

## Answer

Implemented `selectedEvidence`, `finalJudgmentPlan`, `interpretedFinalJudgment`,
`buildFinalJudgmentPlan`, `interpretFinalJudgmentPlan`, and pure finding composition in
`internal/semanticlint/routing.go`. `evaluateSemanticRule` now crosses the selected-evidence stage
explicitly before constructing the final plan.

Behavior is preserved: request-size fitting, changed/supporting separation, unselected evidence
exclusion, `not_applicable` short-circuiting, classification, messages, selected IDs, usage, and
errors retain their prior semantics. The obsolete `routeRuleHunks`, `finalRequest`, and
`fitFinalEvidence` paths were removed.

Verification:

- `go test ./internal/semanticlint -run '^(TestRelevancePlanDeclaresEveryJudgmentBeforeEvaluation|TestRelevancePolicyUsesStableRankingThresholdAndLimit|TestSelectedEvidenceWithoutChangedCandidateIsNotApplicable|TestNoChangedSelectedEvidenceSkipsFinalJudgment|TestFinalFindingCompositionPreservesClassificationMessagesAndSelectedIDs|TestFinalJudgmentPlanSeparatesChangedAndSupportingSelectedEvidence|TestFinalJudgmentPlanRejectsMissingNoul|TestSemanticRoutingExcludesUnselectedFilesFromFinalJudgment|TestSemanticRoutingWithoutRepositoryEvidenceIsNotApplicable|TestNoneChoiceStopsBeforeRelevanceEvaluation)$' -count=1` — passed.
- `./scripts/check.sh` — passed.
