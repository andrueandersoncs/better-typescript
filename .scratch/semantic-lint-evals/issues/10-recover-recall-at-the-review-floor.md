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
3. Case-informed rewording of the 22 weak policies with missed `train` violations (agents read only `train` cases; no case text copied; one batch). 3 vs 3 runs against a fresh `jev-1.13.0` baseline. Held-out `val` + `test`: target policies surfaced 42.1% → 67.5% (38 violations), false `violation` 0% → 0%, `review` on clean 0% → 0.6%; other policies flat (78.7% → 79.3%); all policies 73.9% → 77.8%. Compare verdicts: `test` score better (92.3 → 93.2), `val` no metric changed, `train` better (overfit expected); input tokens +3–4%, which alone makes every verdict `worse`. Accepted for recall.
4. New `train` cases, then case-informed rewording. 39 policies still missed `val`/`test` violations with no `train` miss to learn from; authors who saw only policy text wrote 2 `train` contrast pairs each (156 cases, blind Claude labeler κ 0.987, 1 disagreement left `ambiguous`). The current text missed 82 of 234 of their violation outcomes (1.3 M billed tokens for 3 runs); 20 policies missed or false-flagged, and those were reworded from `train` only. 3 vs 3 on those 20 policies' cases only (345 cases, 9.4 M billed tokens instead of ~39 M for all splits). Held-out `val` + `test`: surfaced 38.0% → 64.3% (43 violations), `violation` 21.7% → 43.4%; false `violation` 0 → 2 of 468 clean outcomes (one case); `review` on clean 0.4% → 0.9%. `val` surfaced recall better; `test` +23.6 pts but within noise. Production request bytes on the workload (dry run): +7.0% (+14.1% across attempts 3 and 4). Accepted for recall.

## State after this round

All splits, 3 runs: surfaced 73.5% (`violation` 64.9%), silent misses 26.5%, false `violation` 0.8%, `review` on clean 1.5%.

## Next levers

- A newer Jev model: checked 2026-10-09, none available. `jev-preview` requests return `returnedModel: jev-1.13.0`; 3 runs per side on `val` and `test` match the pinned model within run noise (surfaced 78.0% vs 78.0% `val`, 66.7% vs 66.0% `test`). Recheck when `GET /v1/models` lists a new release.

## Offline findings (no TypeSafe credits)

- Models: the free `GET /v1/models` lists `jev-latest` and `jev-preview` (both released 2026-09-10; preview "should be better in most ways"). Evals pin `jev-1.13.0`.
- Label audit of all 776 non-planted cases of the 61 weak policies against their current text: blind Claude agents and GPT-6.1-Sol, never shown linter outcomes. Confirmed 678; auditors split on 76 (corpus label kept by majority); both auditors overturned 20 (13 violations → clean, 7 clean → violations), now recorded in `labels.auditClaude`/`labels.auditGpt`; 8 contrast pairs unlinked. Re-scored existing runs: surfaced 73.5% → 74.9% overall, 49.7% → 51.6% on weak policies. The gap is real, not mislabeling.
- Discrimination: weak-policy AUROC 0.876 against 0.993 for the other 72 policies; their violations score a median 0.56 (quartiles 0.29–0.83) against 0.87. Lowering their cutoff to 0.45 would surface 61% (from 51%) but flag 5% of clean cases (from 2%): the same trade the 0.55 floor removed. Per-policy thresholds are not a fix.
- Case-informed rewording per policy, as for `separate-service-interfaces-from-layer-construction` (0% → 100%): tune on `train`, confirm on `val`/`test`, accept one batch.
- Label audit of the ~200 weak-policy violations: where the oracle and a second model both read a case as borderline, the label may be stricter than the policy text.
- Long-context check: a 10-line `while` loop planted at the start, middle, or end of 1K–30K-token Effect source scores 0.97–0.99 on `jev-1.13.0`; without it, 0.01–0.02. Jev does not lose details in long requests (Clef-Flash does), so request size does not explain the recall gap.

Reports: `~/.cache/better-typescript-evals/2026-10-02/base10-*`, `gf-*`, `compare-gf-*`, `rw-*`, `gepa-final-1/`; `2026-10-09/base-*`, `prev-*` (pinned vs `jev-preview`), `rw2-*`, `compare-rw2-*` (attempt 3), `nt-base-*`, `sub-base-*`, `sub-rw3-*`, `compare-sub-rw3-*` (attempt 4).
