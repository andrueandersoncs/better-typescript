# Run baselines and set the noise floor

Category: task
Status: resolved

## Do

1. Three `val` runs of `TestSemanticEvalCases` with no `SEMANTIC_EVAL_CACHE`.
2. One `val` run and one workload run with `SEMANTIC_EVAL_CACHE` set; keep that cache for later replays.
3. Compare run 1 with runs 2 and 3.

## Acceptance

- [x] Reports and comparisons saved outside the repo; paths and `variant`/`corpus` digests recorded here.
- [x] Noise floor recorded: score interval width, flips, and per-metric intervals between repeats.
- [x] Weakest stage named from `candidateRecall`, `routeRecall`, `oracleAuroc`, `applicabilityAuroc`.
- [x] Workload tokens, requests, rounds, and `byStage` shares recorded.

## Answer

2026-10-02, `jev-1.13.0` (every response). Reports in `~/.cache/better-typescript-evals/2026-10-02/`: `val-1.json` … `val-6.json` (uncached), `val-cached.json` and `workload.json` (replay cache in `cache/`). Variant `sha256:bc820649bee41ed7…`, `val` corpus `sha256:5ec07351d804f422…`.

### Accuracy (`val`, 172 cases, 6 uncached runs)

| Metric | Mean | SD |
| --- | --- | --- |
| score | 0.855 | 0.005 |
| violationPrecision | 0.948 | 0.011 |
| surfaceRecall | 0.811 | 0.011 |
| silentMissRate | 0.167 | 0.009 |
| pairAccuracy | 0.871 | 0.019 |
| auroc | 0.888 | 0.005 |
| candidateRecall | 0.840 | 0.008 |
| routeRecall | 0.840 | 0.008 |
| oracleAuroc | 0.938 | 0.002 |
| applicabilityAuroc | 0.969 | 0.002 |
| gatedApplicableRate | 0.005 | 0.003 |

- Weakest stage: `candidate`. Every silent miss is a candidate miss; search never dropped gold lines once selected (0 in 6 runs). Verdicts on gold lines (oracle AUROC 0.94) beat end to end (0.89).
- Misses concentrate in three policies (per run): `separate-service-interfaces-from-layer-construction` 6, `name-things-by-their-purpose` 3.5, `replace-unexplained-values-with-meaningful-names` 3.
- Run cost: 1.20 M input tokens (≈ $0.05), 31 s.

### Noise

- Noul noise matches TypeSafe's report (oracle violation SD 0.010), but the 0.40 selection cutoff amplifies it: 18 of 172 cases change outcome across 6 runs.
- Single-run comparisons of identical prompts gave a non-`no-change` verdict 4 of 15 times with a 95% interval on all 13 metrics, and 3 of 15 with 99% intervals for gates.
- Three runs per side gave `no-change` in all 10 splits of the 6 runs. Rule adopted: ≥3 runs per side, 95% intervals for `score` and `efficiency`, 99% for gates. Resolution: about ±0.006 score.

### Workload (50 files, 1.75 MB, all matching policies)

- 62.8 M input tokens (≈ $2.64), 58,882 requests, 34 min summed wall time (4 files at a time).
- Token share: `route` 82.6% (56,719 requests, ≈ 61 per judged file-policy pair), `candidate` 13.2%, `final` 4.2%.
- Rounds up to 302 per file; 64–256 KB files take 107 s median.
- `--dry-run` sees only the candidate stage, so it understated cost; search is the cost.
