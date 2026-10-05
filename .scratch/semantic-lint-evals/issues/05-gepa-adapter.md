# Run GEPA on the weakest component

Category: enhancement
Status: resolved

Weakest stage (issue 01): `candidate`. All silent misses (16.7% of violations) are candidate misses, concentrated in `effect/separate-service-interfaces-from-layer-construction` and both readability policies. Optimize `prompts.Candidate` first.

## Do

- Adapter: `scripts/semantic_gepa.py`. `evaluate` writes the variant JSON and runs `TestSemanticEvalCases` with `SEMANTIC_EVAL_CASES`; `make_reflective_dataset` maps case `feedback` to components (see spec "GEPA wiring").
- `objective_scores = {accuracy, efficiency}`, `frontier_type="hybrid"`, `train` for reflection, `val` for selection.

## Acceptance

- [ ] Best variant vs baseline on `val`, 3 runs per side: verdict `better`, no metric `worse`.
- [ ] One `test` run recorded; `checkVariant` passed.
- [ ] Winning prompts land in `prompts.go` with docs updated; `./scripts/check.sh` passes.

## Comments

### 2026-10-02 — first run, not accepted

Reflection model: the omp `slow` role (`openai-codex/gpt-6-astra:max`) through the eval kernel's `completion()`, since `.env` has no LLM key. 97 iterations, 123 min, `max_metric_calls=1500`, minibatch 6. Run directory: `~/.cache/better-typescript-evals/2026-10-02/gepa-candidate/`.

- One candidate was kept: `val` 0.869 vs seed 0.848, single runs. Its candidate prompt is 5.5 KB of case-specific guidance (`context.authorization !== undefined`, “Could not load invoice”, `prices.find`). It memorized train cases, and its length would repeat in every candidate question.
- TypeSafe credits ran out at iteration 2. The adapter scored every `402` failure as 0, so the remaining ~95 iterations were wasted, and the reflection model wrote the billing errors into its proposals.

Guards added:

- `checkVariant` (every live run): `evidence` must contain `{block}`; each field ≤ 2× its default length (raised to 4× before the second run); no policy title, 8-word corpus run, multi-word corpus string literal, or corpus-only compound or dotted code name. Failures start with `variant rejected:`. The first run's prompt is rejected (5,547 bytes; 2× limit 486, 4× limit 972).
- Adapter: a rejected variant scores 0 with the reason as feedback; any other harness failure or case error raises and stops GEPA. Smoke-tested: overlong and leaking variants come back rejected with reasons, and the current `402` raises.

### 2026-10-02 — second run, rejected by the decision rule

Reflection model: `openai-codex/gpt-6.1-sol:high` (omp `slow` role, set for this session only). The adapter now passes GEPA a reflection template that states the harness limits (4× length, no corpus quotes, general across policies), because GEPA discards rejected proposals without showing the reason. A run without it rejected all 111 proposals for length.

22 iterations, 17 min, 8 candidates. Best prompt: 889 bytes, general guidance, no corpus quotes; `~/.cache/better-typescript-evals/2026-10-02/gepa-candidate-3/best-variant.json`.

| Measure | Baseline (block scoring) | GEPA prompt |
| --- | --- | --- |
| `val` score, 3 vs 3 | 0.854 | 0.872 (better) |
| `val` silent misses | 16.3% | 8.0% (better) |
| `val` candidate recall | 0.844 | 0.920 (better) |
| `val` violation precision | 0.939 | 0.938 (no change) |
| `test` score, 3 vs 3 | 0.849 | 0.860 (no change, interval −0.003 to 0.029) |
| `test` silent misses | 23.1% | 14.5% (better) |
| `test` violation precision | 0.891 | 0.874 (no change) |
| `val` / `test` tokens | — | +21% / +23% (worse) |
| Workload tokens | 20.6 M | 45.5 M (+121%) |

Workload by stage: candidate 8.3 M → 15.8 M (the longer prompt pushes 76 questions per span into about twice as many requests, resending each span); evidence 9.5 M → 25.1 M and final 2.8 M → 4.6 M (more spans selected). Verdict `worse` on efficiency, so not landed.

### 2026-10-02 — paired with the 64,000-byte cap (issue 02)

Maintainer asked to pair the prompt with the cap raise, then re-measure. With the cap, 3 runs per side:

| Comparison | Accuracy | Tokens |
| --- | --- | --- |
| `val`, GEPA + cap vs baseline | score 0.854 → 0.872, silent misses 16.3% → 8.3%, AUROC 0.891 → 0.921 (better) | +21% (worse) |
| `test`, GEPA + cap vs baseline | no metric changed beyond noise | +23% (worse) |
| `val` packed (all policies), GEPA vs default, both with cap | score 0.853 → 0.870, silent misses 16.7% → 8.7% (better) | 22.6 M → 47.3 M per run (worse) |
| Packing parity: GEPA packed vs unpacked | no accuracy metric changed | — |
| Workload | — | default + cap 21.4 M; GEPA + cap 46.5 M (2.2×) |

The cap does not recover the cost. The growth is prompt text repeated per question (candidate 7.5 M → 14.2 M) and broader selection (evidence 9.4 M → 24.6 M, final 4.5 M → 7.7 M), not resent source. Verdict still `worse` on efficiency; awaiting the maintainer's call. Reports: `~/.cache/better-typescript-evals/2026-10-02/{val,test}-gepa-cap-{1,2,3}.json`, `val-*-cap-packed-{1,2,3}.json`, `workload-gepa-cap.json`.

### 2026-10-05 — cost-gated GEPA (maintainer's option 2)

The adapter now estimates each variant's cost on the efficiency workload and scores it 0 above a ratio (`--workload-report`, `--max-cost-ratio`). The candidate stage is computed from prompt length (every candidate question repeats it); evidence and final follow the variant's measured tokens against the seed on the same cases, smoothed by one minibatch. The reflection template states the budget. Checked on the 2.2× prompt: full-`val` estimate 1.67×, rejected; seed repeats estimate 1.00× and are never rejected. Because the estimate understated the real workload ratio (1.67 vs 2.18), the gate was set to 1.2×.

| Run | Iterations | Candidates | Gated out | Best vs seed |
| --- | --- | --- | --- | --- |
| 1,500 calls, minibatch 6, full `val` selection | 11 | 7 | 4 | 0.850 vs 0.849 (noise) |
| 3,000 calls, minibatch 10, 60-case `val` selection | 55 | 32 | 13 | none beat the seed (0.881) |

No cost-bounded prompt improved accuracy; the seed remains best. The recall gain found earlier comes with broader selection, and broader selection is the cost. Nothing landed. Runs: `~/.cache/better-typescript-evals/2026-10-02/gepa-candidate-{4,5}/`.

### 2026-10-05 — landed by maintainer decision

The maintainer chose the recall gain over cost: the second run's 889-byte prompt is now `defaultPrompts.Candidate`, byte-for-byte the accepted variant (checked through a live run's reported prompts). Expected effect, from the 3-vs-3 runs with the 64,000-byte cap: `val` silent misses 16.3% → 8.3%, `test` 23.1% → 14.5%, precision unchanged; workload 21.4 M → 46.5 M tokens. `Array.ts` dry run: candidate-stage request bytes 3.12 MB → 5.57 MB.

Future comparisons and cost gates need new seed baselines: `val-gepa-cap-{1,2,3}.json`, `test-gepa-cap-{1,2,3}.json`, and `workload-gepa-cap.json` are runs of this prompt.
