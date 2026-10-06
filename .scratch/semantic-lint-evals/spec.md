# Semantic lint evals

Goal: score `internal/semanticlint` so GEPA can hill-climb **accuracy** and **efficiency** without fooling itself.

## Terms

| Term | Meaning |
| --- | --- |
| Case | One file + one policy + gold label |
| Gold label | `violates`, `complies`, `not-applicable`, or `ambiguous` (excluded from scoring) |
| Gold lines | Line ranges that prove a `violates` label |
| Stage | `candidate` (span Nouls) → `evidence` (block Nouls) → `final` (violation Noul) + `applicability` (Noul) |
| Outcome | Tool result: `violation`, `review`, `pass`, `inconclusive` |
| Variant | One set of prompt texts under test. GEPA calls this a "candidate"; renamed to avoid clashing with candidate spans |
| Trace | Every request, answer, usage, and stage for one case |
| Workload | Unlabeled real files run with all matching policies; efficiency only |

## Facts the design rests on

- The pipeline is a cascade. A gold line dropped by `candidate` or `evidence` is never judged (`evaluateSource`, `selectEvidence`).
- Price is input tokens only; output is free: $0.042/Mtok on `jev-1.13.0` ([models](https://docs.typesafe.ai/models.md)).
- `jev-latest` is a moving alias ([models](https://docs.typesafe.ai/models.md)).
- Before issue 06, Choice search was 82.6% of workload input tokens (issue 01). `--dry-run` sees only the candidate stage, so it understates cost. Within that stage, `Array.ts` (144.5 KB, 76 policies) needs 3.12 MB of requests, 87.8% of it question text.
- The 32,000-byte request cap splits 76 policy questions into 2 requests per span, so each span is sent twice. The API allows 64k tokens per request.
- Jev noise is small but real: mean Noul std 0.0102 across repeats in TypeSafe's own test ([self-consistency](https://docs.typesafe.ai/cookbooks/consistency_noul_cookbook.md)). Threshold flips still happen.
- Jev loses accuracy as state fills with irrelevant text ([jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md)). Span size trades accuracy for cost, so both evals run on every variant.

## What gets optimized

| Component | Code | Optimizer |
| --- | --- | --- |
| `candidate` prompt | `prompts.Candidate` | GEPA |
| `evidence` prompt | `prompts.Evidence` (must contain `{block}`) | GEPA |
| `final` prompt | `prompts.Final` | GEPA |
| `applicability` prompt + criteria | `prompts.Applicability`, `ApplicabilityTrue`, `ApplicabilityFalse` | GEPA |
| Final thresholds (0.4 pass, 0.7 violation, 0.7 applicability) | constants | Offline sweep over recorded probabilities; no API calls |
| Evidence block size (400 bytes) and selection cutoffs (0.4) | constants | Live grid search |
| Policy texts (`defaults/**/*.md`) | — | Out of scope: they define meaning. Rewrite low-agreement policies by hand |

## Accuracy corpus

One labeled corpus feeds every accuracy metric, including stage metrics.

| Origin | Content | Purpose |
| --- | --- | --- |
| `contrast` | Per policy: a violating snippet, its minimal fix, an unrelated file | Discrimination; cheap to label |
| `planted` | A violating snippet inserted into a large compliant real file at a span edge, the middle, the end, or split across distant halves | Retrieval stress; gold lines exact by construction |
| `real` | Sampled (file, policy) pairs from `repos/effect` and other real repos | Real precision; synthetic code is too easy |
| `regression` | Every reported false positive or miss, e.g. GitHub #12 | Known bugs never return |

Labeling:

- The author labels by construction. A blind second labeler (fresh agent, renamed files, no corpus access) labels every non-planted case. A reviewer resolves disagreements; the default is `ambiguous`.
- `violates` requires gold lines. `goldLines` are jointly required unless `goldAny` is set (several independent occurrences; any one proves it).
- Report Cohen's κ per policy. κ < 0.6 means the policy text is ambiguous: label `ambiguous`, rewrite the policy, and do not tune prompts against it.
- `ambiguous` cases are never scored.

Splits: `train` (GEPA reflection), `val` (GEPA selection), `test` (held out). Split by host and contrast pair; never split a pair. Planted cases follow their snippet's pair. Grow `val` until its noise floor is below the smallest gain worth keeping (Gall's law: grow a working small eval).

Location: `internal/semanticlint/testdata/evals/`. One `cases/<policy>.jsonl` per policy; sources in `files/<policy>/`; real hosts in `hosts/` and sampled real files in `real/` (provenance in each `sources.txt`). `go test ./internal/semanticlint` validates every case: policy and glob match, labels, pairs, gold bounds, and leak words in authored text.

```json
{"id":"performance/avoid-repeated-linear-lookups/pair-3-violates","policy":"performance/avoid-repeated-linear-lookups","path":"src/billing/reconcile.ts","file":"files/performance/avoid-repeated-linear-lookups/pair-3-violates.ts","label":"violates","goldLines":[[9,14]],"origin":"contrast","pair":"performance/avoid-repeated-linear-lookups/pair-3-complies","split":"val","labels":{"author":"violates","blind":"violates"}}
{"id":"performance/avoid-repeated-linear-lookups/planted-test-middle","policy":"performance/avoid-repeated-linear-lookups","path":"packages/tools/docgen/src/Core.ts","plant":{"host":"hosts/docgen-Core.ts","parts":[{"file":"files/performance/avoid-repeated-linear-lookups/pair-5-violates.ts","at":0.5}]},"label":"violates","origin":"planted","split":"test","labels":{"author":"violates"}}
```

### Corpus

- 19 policies, 414 cases: 228 `contrast`, 68 `planted`, 118 `real` (36 host cases, 82 sampled pairs). None `ambiguous`.
- Scored: `train` 100, `val` 191, `test` 123.
- Synthetic labels: two Claude agents; violates-vs-not κ 0.96, three-way κ 0.80.
- Sampled real pairs (24 Effect files, seeded by SHA-256): Claude agents vs GPT-6.1-Sol, blind. Violates-vs-not 75/84 (κ 0.47), three-way 71/84 (κ 0.73).
- Human tiebreak (issue 04): every disagreement resolved; `labels.human` records it. `complies` vs `not-applicable` uses the broad reading: if the file has anything the policy could govern (a test, a pure function, a loop, a literal), a clean file `complies`.
- `typescript-contracts/use-strict-runtime-specific-tsconfig-files` was removed by maintainer decision; its evidence often sits in an extended base file.

## Accuracy eval

Per-case score (GEPA `scores`):

- `y` = 1 for `violates`, else 0.
- `p` = the reported violation probability; 0 when absent (`inconclusive` says nothing).
- For `violates`, `p` = 0 when reported ranges miss any gold range: right verdict, wrong evidence.
- `score = 1 − (y − p)²`. Mean score = 1 − Brier: a proper scoring rule, so it rewards calibration and stays smooth for hill climbing.

Gates (never worse than baseline beyond noise):

| Metric | Definition |
| --- | --- |
| Violation precision | Gold `violates` ÷ `violation` outcomes. False alarms fail CI |
| Surface recall | `violation` or `review` on gold `violates` |
| Silent-miss rate | `inconclusive` on gold `violates` |
| Pair accuracy | `p(violating) > p(fixed)` per contrast pair |
| AUROC | `p` against `y` |
| Flip rate | Outcome changes across 3 identical runs |
| Packing parity | Sampled `val` cases score the same, within noise, alone and packed with all policies |

Stage metrics (attribution from gold lines; no extra labels):

| Stage | Metrics |
| --- | --- |
| `candidate` | `candidateRecall`: selected spans (> 0.4) overlap the gold lines |
| `evidence` | `evidenceRecall`: final evidence overlaps the gold lines |
| `final` | Oracle run on gold lines alone (whole file when there are none): `oracleAuroc`, `oracleBrier`. Separates verdict quality from retrieval |
| `applicability` | `applicabilityAuroc` (oracle) for applicable vs `not-applicable`; `gatedApplicableRate`: applicable cases hidden by the 0.70 gate |

Stage cost lives in the efficiency report (`byStage`). End-to-end recall ≤ candidate recall × evidence recall × final recall on gold lines. Tune the weakest link first.

Feedback per component (read by GEPA's reflection model):

- `candidate`: "Label violates; gold lines 40-52. Spans covering gold: lines 30-90 scored 0.22. Selection needs > 0.40, so the policy was never judged on the gold lines."
- `evidence`: "Dropped gold lines 63-70; final evidence lines 30-61. Gold blocks at or below 0.40: lines 60-71 scored 0.22."
- `final`: "Label violates; outcome review with violation probability 0.62 on evidence lines 40-52. On gold lines 40-52 alone: violation 0.83."
- `applicability`: "Policy subject is present (label complies), but applicability 0.42 < 0.70 hid the finding."

## Efficiency eval

Workload: `testdata/evals/workload.txt`, 50 real Effect files (13 ≤4 KB, 13 at 4–16 KB, 12 at 16–64 KB, 12 at 64–256 KB; evenly spaced picks from sorted `git ls-files 'repos/effect/packages/*/src/**/*.ts' 'repos/effect/packages/*/*/src/**/*.ts'` minus `.d.ts`). Every matching default policy, run like `semantic --files`. No labels.

| Metric | Unit | Notes |
| --- | --- | --- |
| Input tokens | per file, per source KB | Primary; equals cost. From `usage.input_tokens` |
| Requests | per file | Rate limit: 40 requests/s |
| Rounds | sequential API rounds per file | Observed: one per wave of concurrent requests (candidate, evidence, final = 3) |
| Wall time | p50/p95 seconds per file at concurrency 8 | Secondary; dynamic rate limits move it |
| Retries | count | Excluded from tokens |

Decomposition: stage (`candidate`, `evidence`, `final`) × byte source (file text, prompt prefix, policy text, JSON overhead). Candidate-stage bytes are exact and free from `--dry-run`; `evidence` and `final` need answers. Amdahl's law: cut the largest cell first.

Per-case GEPA objective: `efficiency = log2(baselineTokens ÷ variantTokens)`. 0 = unchanged; +1 = half the tokens.

## Running

- Pin `jev-1.13.0`. Comparisons refuse different models or corpus digests; variants and packing may differ.
- Replay cache (`SEMANTIC_EVAL_CACHE`): request SHA-256 → response. Unchanged requests replay exactly and free; only changed requests go live. Disable it for noise-floor repeats.
- Decision rule (measured in issue 01): ≥3 runs per side, metrics averaged over a side's runs, paired bootstrap over cases. `score` and `efficiency` use 95% intervals; gates use 99%. On identical prompts this gave `no-change` in 10 of 10 three-vs-three splits but a false verdict in 3 of 15 single-run pairs.
- Cost with the landed candidate prompt: a `val` run ≈ 1.2 M tokens ($0.05); a packed `val` run ≈ 47.3 M ($2.00); the workload ≈ 46.5 M ($1.95). With the earlier prompt: 1.0 M, 22.6 M, and 21.4 M. A GEPA run (1,500 metric calls) took about 17 min.

```sh
# One labeled split (val by default); SEMANTIC_EVAL_CASES=<ids> for a GEPA minibatch
SEMANTIC_EVAL_OUT=/tmp/val-1.json go test -tags semanticeval -run '^TestSemanticEvalCases$' -count=1 -timeout 0 ./internal/semanticlint
# Prompt variant: JSON with any of the prompts.go fields
SEMANTIC_EVAL_VARIANT=variant.json SEMANTIC_EVAL_OUT=/tmp/val-v.json go test -tags semanticeval -run '^TestSemanticEvalCases$' -count=1 -timeout 0 ./internal/semanticlint
# Efficiency workload
SEMANTIC_EVAL_OUT=/tmp/workload.json go test -tags semanticeval -run '^TestSemanticEvalWorkload$' -count=1 -timeout 0 ./internal/semanticlint
# Paired comparison (offline); comma-separate repeated runs on each side
SEMANTIC_EVAL_BASELINE=/tmp/val-1.json,/tmp/val-2.json,/tmp/val-3.json SEMANTIC_EVAL_CANDIDATE=/tmp/val-v1.json,/tmp/val-v2.json,/tmp/val-v3.json SEMANTIC_EVAL_OUT=/tmp/diff.json go test -tags semanticeval -run '^TestSemanticEvalCompare$' -count=1 ./internal/semanticlint
```

Flip rate: `flips` (cases whose outcome differs in any compared run). Packing parity: compare `SEMANTIC_EVAL_PACKED=1` runs with normal runs.

GEPA wiring:

- `seed_candidate`: chosen `prompts.go` fields (`candidate`, `evidence`, `final`, `applicability`, `applicabilityTrue`, `applicabilityFalse`).
- `evaluate`: write the variant JSON, run `TestSemanticEvalCases` on the batch ids; return `scores` = case `score`, `objective_scores` = `{accuracy: score, efficiency: log2(seed tokens ÷ case tokens)}`.
- Rejected variants (`variant rejected:` from the harness) score 0 with the reason as feedback. Any other failure, including a case error such as TypeSafe `402`, raises and stops GEPA.
- `make_reflective_dataset`: each case's `feedback[<component>]` (applicability criteria map to `applicability`), plus the policy and gold-region code.
- `frontier_type="hybrid"`: keep variants that win on any example or objective.
- GEPA's own minibatch acceptance can use single runs; final acceptance is the 3-vs-3 verdict `better` on `val` (no metric `worse`), then one `test` run.
- Adapter: `scripts/semantic_gepa.py`. Cost gate: `--workload-report` (a workload report for the seed prompts) and `--max-cost-ratio` score 0 any variant whose estimated workload cost exceeds the ratio. The estimate takes the candidate stage from prompt length and evidence and final from tokens measured against the seed on the same cases; it understated one real ratio (1.67 vs 2.18). `--selection-size` lets GEPA select on a `val` subset to spend more budget on proposals.

## Harness

- `prompts.go`: every instruction and criterion in one `prompts` value; `Options.prompts` (unexported) overrides `defaultPrompts`. The CLI has no new flag.
- `evaluationRequest.scope` (never sent): stage, round, and source window or blocks, set by `evaluatePartitions`. Evals read it to attribute misses, tokens, and rounds.
- `eval_test.go`: corpus loading and validation, planting, tracing evaluator with replay cache, scoring, metrics, oracle, feedback, workload, paired bootstrap, variant checks.
- `checkVariant`: every live run refuses a variant whose `evidence` prompt lacks `{block}`, whose any field exceeds 4× its default length, or that quotes the corpus (see anti-gaming).
- `eval_live_test.go` (build tag `semanticeval`): the three entry points above. Not run by `check.sh`.
- Report: `accuracy` (metric → value), `efficiency` (`inputTokens`, `requests`, `requestBytes`, `cachedRequests`, `rounds` = max, `byStage` with tokens, requests, questions, and bytes), `oracleInputTokens` (excluded from efficiency), and `cases[]` with `outcome`, `probability`, `effective`, `score`, `candidateHit`, `localized`, `oracle`, `efficiency`, `feedback`.

## Findings so far

Baselines, noise, and workload: `issues/01-run-baselines.md`.

- Accuracy: `val` score 0.855 ± 0.005; violation precision 0.95; 16.7% of violations missed silently.
- Weakest stage: `candidate`. Every silent miss is a candidate miss; neither search design dropped selected gold lines.
- Issue 03: all policies search together. Same requests and answers on replay; max rounds 302 → 10.
- Issue 06: block scoring replaced Choice search. Workload 62.8 M → 20.6 M tokens (−67%), 58,882 → 3,947 requests, max rounds 3. `val` (3 runs vs 6): no metric worse; tokens −14%. Evidence median 19 → 25 lines.
- Issue 05, first GEPA run: the kept candidate prompt grew to 5.5 KB of case-specific guidance (`context.authorization`, “Could not load invoice”). TypeSafe credits ran out at iteration 2 (`402`), and the old adapter scored the failures as 0 instead of stopping. Not accepted; guards below added.
- Issue 05, second run (GPT-6.1-Sol reflection, limits stated in the reflection template): an 889-byte general prompt halved `val` silent misses (16.3% → 8.0%) and lifted `val` score 0.854 → 0.872; on `test` silent misses 23.1% → 14.5%, score change within noise. Workload tokens +121% (20.6 M → 45.5 M). Verdict `worse` on efficiency; not landed pending a maintainer call.
- Issue 02: request cap 32,000 → 64,000. Accuracy unchanged; workload requests 3,947 → 3,024, tokens 20.6 M → 21.4 M because 156 more file-policy pairs now fit one final request. Pairing it with the GEPA prompt leaves that prompt at 2.2× workload cost (46.5 M).
- Issue 05, cost-gated GEPA (gate 1.2× estimated workload cost): two runs, 66 iterations, 39 candidates; none beat the seed prompt. Recall gains from the candidate prompt came with broader selection, which is the cost.
- Landed (maintainer decision): the 889-byte GEPA candidate prompt is the default. Current baseline: `val` score 0.872, silent misses 8.3%; workload 46.5 M tokens. Use `{val,test}-gepa-cap-*` and `workload-gepa-cap` as the seed reports for the next comparison or cost gate.
- Issue 04, real cases added (3 runs per split): real clean files score 0.94; real violations are few (8 scored) and about half surface, so real-code recall is still unmeasured. Both real `replace-unexplained-values-with-meaningful-names` violations are candidate misses in every run. New seed reports: `{val,test}-real-{1,2,3}.json`.

## Anti-gaming (Goodhart's law)

| Exploit | Guard |
| --- | --- |
| Abstain on everything | `inconclusive` scores `p` = 0 on `violates`; silent-miss gate |
| Flag everything | `complies` and `not-applicable` cases; precision gate |
| Select nothing to save tokens | Stage recall gates |
| Bloat prompts for accuracy | Each field ≤ 4× its default length; efficiency objective |
| Overfit `val` | Held-out `test`; split by repo and pair |
| Copy corpus code or policy names into prompts | `checkVariant` refuses a policy title, any 8-word run of corpus-authored text, a multi-word corpus string literal, or a compound or dotted code name found in authored cases but not in policies, default prompts, or hosts |
| Exploit label errors | Hits without gold overlap score 0; review `localized: false` hits for missing gold lines |
| Model drift | Pinned model; mismatched runs refuse comparison |
| Shift cost to an unmeasured stage | Measure all stages; `--dry-run` alone covers only `candidate` |

## Build order

1. Harness with replay cache. Done.
2. v0 corpus: 20 policies, `contrast` + `planted` + host-only `real`, blind-labeled. Done.
3. Baseline × 6 for the noise floor, plus workload baseline. Done (issue 01).
4. More `real` and `regression` cases; human label pass.
5. GEPA on the weakest-link component first. Done: the candidate prompt was replaced, trading 2.2× workload cost for half the silent misses (issue 05).

Tickets: `issues/`.

Related: `.scratch/semantic-lint-score-interpretation/` adds source, policy, and evaluator fingerprints; reuse them as corpus and variant digests.
