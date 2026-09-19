# 04 — Expose the selected-evidence stage

**Specification:** [Declarative semantic review](../spec.md)

Status: ready-for-agent

Blocked by: 03

## What to build

Make the essential result-shaped dependency explicit in `evaluateSemanticRule`.

Introduce a concrete selected-evidence value produced by pure relevance policy. Build the final
judgment plan only from that value. The orchestration must visibly cross this stage instead of
hiding it in a callback, closure, or general `Bind` operation.

The final judgment remains one Noul over the exact selected changed and supporting evidence.

## Acceptance criteria

- [ ] A package-private selected-evidence type distinguishes selected evidence from candidates and
      scored evidence.
- [ ] Pure policy owns relevance thresholding, ranking, maximum selection, and changed-evidence
      presence.
- [ ] Final-plan construction accepts selected evidence directly and cannot run before selection.
- [ ] `not_applicable` remains the explicit outcome when selected evidence contains no changed
      candidate; no final judgment is evaluated.
- [ ] Final state preserves the changed/supporting split and excludes unselected evidence.
- [ ] Probability classification and finding messages preserve current behavior.
- [ ] `evaluateSemanticRule` reads as named stage composition with no hidden result-shaped callback.
- [ ] The narrow final-request and no-applicable-evidence tests cover the stage seam.
- [ ] `./scripts/check.sh` passes.

## Non-goals

- Enumerating possible evidence subsets.
- A general Monad or `Bind` interface.
- Changing classification thresholds or finding output.
- Exporting stage types.
