# Recover recall lost to the 0.55 review floor

Category: enhancement
Status: needs-triage

Raising the review floor to 0.55 (issue 09) cut file-level surfaced violations on split policies from 83% to 64%. The maintainer wants that recall back without the review noise.

## Baseline (all splits, 3 runs, 1,674 cases)

- Violations surfaced 74.5% (`violation` 64.7%), silent misses 25.5%; false `violation` on clean files 1.5%, `review` 1.4%.
- Where violation outcomes end: `violation` 64.7%, `review` 9.8%, `pass` at 0.40–0.55 10.6%, `pass` ≤ 0.40 7.0%, no candidate or evidence 7.4%, applicability gate 0.6%. The final judgment, not selection, loses most.
- 61 policies with surfaced < 80% or false `violation` > 10% hold 95% of silently missed violations. Their whole-file oracle averages 0.58 on violating cases: the model itself reads them as borderline.

## Tried

1. GEPA on the final prompt (GPT-6.1-Sol reflection; 3,000 metric calls, 21 candidates, selection on 104 `val` cases): selection score 0.917 → 0.925, but full `val` and `test` (3 vs 3) showed no metric changed and efficiency worse (+2%). Rejected; general instructions do not move the verdict.
2. Blind rewording of the 61 policies into explicit violation tests (agents saw policy text only, never eval cases; one batch decision): false `violation` on their clean files 2.0% → 0.5% (better), surfaced 51.3% → 49.7% (no change), oracle 0.58 → 0.56; unchanged-policy control flat. Kept for precision.

## State after this round

All splits, 3 runs: surfaced 73.5% (`violation` 64.9%), silent misses 26.5%, false `violation` 0.8%, `review` on clean 1.5%.

## Next levers

- A newer Jev model, if `jev-latest` is newer than the pinned `jev-1.13.0`: unchecked, because TypeSafe credits ran out (402).

## Offline findings (no TypeSafe credits)

- Models: the free `GET /v1/models` lists `jev-latest` and `jev-preview` (both released 2026-09-10; preview "should be better in most ways"). Evals pin `jev-1.13.0`.
- Label audit of all 776 non-planted cases of the 61 weak policies against their current text: blind Claude agents and GPT-6.1-Sol, never shown linter outcomes. Confirmed 678; auditors split on 76 (corpus label kept by majority); both auditors overturned 20 (13 violations → clean, 7 clean → violations), now recorded in `labels.auditClaude`/`labels.auditGpt`; 8 contrast pairs unlinked. Re-scored existing runs: surfaced 73.5% → 74.9% overall, 49.7% → 51.6% on weak policies. The gap is real, not mislabeling.
- Discrimination: weak-policy AUROC 0.876 against 0.993 for the other 72 policies; their violations score a median 0.56 (quartiles 0.29–0.83) against 0.87. Lowering their cutoff to 0.45 would surface 61% (from 51%) but flag 5% of clean cases (from 2%): the same trade the 0.55 floor removed. Per-policy thresholds are not a fix.
- Case-informed rewording per policy, as for `separate-service-interfaces-from-layer-construction` (0% → 100%): tune on `train`, confirm on `val`/`test`, accept one batch.
- Label audit of the ~200 weak-policy violations: where the oracle and a second model both read a case as borderline, the label may be stricter than the policy text.

Reports: `~/.cache/better-typescript-evals/2026-10-02/base10-*`, `gf-*`, `compare-gf-*`, `rw-*`, `gepa-final-1/`.
