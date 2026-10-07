# Raise the review cutoff, cover every policy, confirm cost

Category: enhancement
Status: resolved

Follow-ups from issue 08.

## Review cutoff 0.40 → 0.55

Chosen offline from the issue 07–08 reports (348 reviews), by re-classifying recorded final probabilities:

| Review probability | Reviews | On violating cases |
| --- | --- | --- |
| 0.40–0.45 | 89 | 42% |
| 0.45–0.50 | 67 | 43% |
| 0.50–0.55 | 45 | 31% |
| 0.55–0.60 | 42 | 64% |
| 0.60–0.70 | 105 | 70% |

- File level, split catalog (233 files): `review` on clean files 15.9% → 5.7% (pre-split level 5.1%); surfaced violations 83.0% → 63.8%. Confident `violation` flags unchanged (≥ 0.70).
- `maximumPassProbability` in `types.go`; also moves the applicability gate's lower bound. Live check: no `review` at or below 0.55 in the new-case runs.

## Cases for every policy

- 181 authored files for the 25 policies without cases (three contrast pairs and one not-applicable file each) and three more `name-things` pairs. Author vs GPT-6.1-Sol 173/181 (κ 0.91); a blind reviewer settled the 8 disagreements.
- Corpus: 1,674 cases; all 133 policies have cases.
- Baseline (3 runs, 0.55 cutoff): violations surfaced 83% (80% `violation`), false `violation` on clean files 6%, `review` on clean 2%.
- Weak policies (surfaced < 50% or false `violation` > 20%): `abstraction/do-not-promise-interchangeability-you-cannot-deliver` (3 of 4 clean files flagged), `testing-enforcement/isolate-browser-sessions-and-data` (false 50%), `testing-enforcement/generate-the-domain-the-property-claims` (false 33%), `readability/use-whitespace-to-separate-logical-steps` (0% surfaced), `performance/reuse-invariant-expensive-setup`, `readability/make-interfaces-understandable-at-the-call-site`, `testing-enforcement/execute-properties-through-the-test-runner` (33% surfaced).

## Cost

Live workload with the replay cache (`SEMANTIC_EVAL_CACHE`): 55.9 M → 50.9 M tokens (−9%), 7,178 → 6,624 requests; 452 requests replayed. Against the pre-split catalog (46.5 M), one invariant per policy now costs +9.5%.

Reports: `~/.cache/better-typescript-evals/2026-10-02/new-cases-{1,2,3}.json`, `workload-cleanup.json`.
