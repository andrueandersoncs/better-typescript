# Give each semantic policy one invariant

Category: enhancement
Status: resolved

Maintainer hypothesis: a policy that states one invariant is less ambiguous, so the linter is more accurate.

## Change

- Test: two requirements are separate invariants when a file can break one while keeping the other and they need different fixes. Example lists, remedies, and exclusions stay with the invariant they serve.
- 95 → 140 policies: 14 retired, 59 new, 41 rewritten in place. Map: `../policy-split.json`. Cutover tables: `docs/semantic-lint.md`.
- An invariant repeated across policies got one owner, e.g. boundary decoding (3 policies), explicit dependencies (3), swallowed failures (2), resource release (2).
- Test-only children use test-file globs, as their parents mixed source and test concerns.
- Removed by the maintainer as unclear: `effect/define-services-by-capability-not-client`.

## Corpus

- The 11 split corpus policies had 246 cases; they became 530 cases under 26 policies. Corpus: 698 cases, 34 policies.
- Not-applicable parents give not-applicable children. Planted cases inherit their snippet's labels. 154 files labeled blind by Claude agents and GPT-6.1-Sol: violates-vs-not 373/381 (κ 0.94), three-way 350/381 (κ 0.87).
- Complies-vs-not-applicable disagreements (23) use the broad rule; the 8 violation disagreements went to the maintainer.
- Every parent violation maps to at least one violated child; no clean parent has a violated child.

## Result

File level: did the linter catch each original violation, and did it falsely flag clean files? 187 files of split policies (81 violating, 106 clean), `val` + `test`, 3 runs per side, paired bootstrap 95%.

| Metric | Before | After | 95% interval | Verdict |
| --- | --- | --- | --- | --- |
| Violation flagged (`violation`) | 47.7% | 56.4% | +2.9 to +15.2 pts | better |
| Surfaced (`violation` or `review`) | 73.3% | 77.4% | 0.0 to +9.1 pts | no change |
| Silent misses | 26.7% | 22.6% | −9.1 to 0.0 pts | no change |
| False `violation` on clean files | 1.9% | 2.5% | 0.0 to +1.9 pts | no change |
| `review` on clean files | 4.1% | 6.0% | −1.3 to +5.7 pts | no change |

- After the split, the violated child itself surfaced on 77.4% of violating files.
- Control: 127 cases of unchanged policies show no change on any metric.
- Cost: workload 46.5 M → 55.9 M tokens (+20%), 5,558 → 7,178 requests; candidate questions +37%.

Reports: `~/.cache/better-typescript-evals/2026-10-02/{val,test}-split-{1,2,3}.json`, `workload-split.json`; before: `{val,test}-human-{1,2,3}.json`, `workload-gepa-cap.json`.

## Follow-ups

- `effect/separate-service-interfaces-from-layer-construction` surfaces 0 of 8 violations before and after; `readability/name-things-by-their-purpose` 1 of 7.
- Overlaps between unsplit policies remain: `if-statements` vs `simplicity/keep-control-flow-shallow`; `mutability` vs mutable-state ownership and input mutation; `modularity/use-abstractions-at-meaningful-boundaries-not-everywhere` vs `simplicity/let-abstractions-emerge-from-concrete-needs`; `file-code-organization/group-similar-code-entities` vs `readability/keep-related-code-close-together`; `function-naming` vs `readability/name-things-by-their-purpose`; `readability/make-interfaces-understandable-at-the-call-site` vs `abstraction/do-not-force-variation-through-flags`.
- Too vague to judge consistently: `file-code-organization/simplify-code-organization`, `file-code-organization/group-similar-code-entities`, `simplicity/minimize-maintainer-cognitive-load`.
- Only 11 of the 50 split policies have eval cases; the other splits are unmeasured.
