# Semantic lint optimization journal

Goal: make semantic lint more accurate and cheaper, using the scientific method, without overfitting.

Entries are in time order. Each one says what I did, why, and what I saw.

## Protocol (fixed before any experiment)

### Data

| Set | Use | Touched when |
| --- | --- | --- |
| Dev: corpus `train` + `val` (1,241 cases) | Explore, screen, and confirm variants | Any time |
| Holdout 1: corpus `test` (465 cases) | Confirm only the final bundle | Once, at the end |
| Holdout 2: external real files from sibling projects (not in the corpus) | Confirm cost and accuracy on code the corpus never saw | Once, at the end |

The external files are unlabeled, so accuracy there is measured by **discordance labeling**:

- Run base and the bundle over the same files.
- Where the two disagree on whether a (file, policy) pair is surfaced, blind labelers judge the pair. They see only the file and the policy, never either outcome.
- The side that is right more often on these disagreements is more accurate. Pairs where both runs agree carry no information about the difference, so they don't need labels.

### Guards against overfitting

- No case-informed policy rewording. Only generic levers: pipeline structure, thresholds, and prompt layout.
- Prompts may not quote the corpus. `checkVariant` already enforces this for prompt variants.
- Dev data picks variants. Holdout data only confirms or rejects the final bundle; it is never used to tune.
- Limit the number of variants. Each experiment has a written hypothesis and prediction before it runs.

### Measurement

- **Packed mode** (`SEMANTIC_EVAL_PACKED=1`): every matching policy is asked, as in production. Cost then has the production shape, and the target policy is scored.
- **Paired runs:** run *i* of base and run *i* of a variant share replay cache *i*. A request both sides send gets the same answer on both sides (common random numbers). Only the requests a variant changes are re-sampled. This cuts the noise in the difference.
- 3 runs per side. The verdict comes from `TestSemanticEvalCompare`: 95% interval on `score` and `efficiency`, 99% on gate metrics.
- **Accept** a variant if: efficiency is better and no metric is worse; or score is better and efficiency is not worse. A cost-vs-accuracy trade is recorded but not adopted.

### Cost

TypeSafe bills input tokens at about $0.042 per million, so one dev run costs a few cents to about a dollar. Evaluation cost is not a constraint. Production cost per lint run is what we optimize.

## Background facts (2026-10-10)

- Billing: `state` once per request, plus every question's text. Tokens ≈ request bytes ÷ 3.2.
- Answers vary by repeat: the same request scored 0.20–0.30 on one Noul over 5 calls.
- Where production tokens go (`workload-cleanup.json`, 50 Effect files, packed, 50.9 M tokens):
  - candidate 34% (58,944 questions in 1,825 requests, about 32 policies per request);
  - evidence 49% (128,656 block questions);
  - final 17%.
- In single-policy `val` evals, candidate is 74%. Single-policy evals misstate production cost, so dev runs use packed mode.
- Where violations are lost (`val`, 3 runs of base, 492 violation outcomes):
  - 407 surfaced;
  - 85 missed: 58 `pass`, 24 with no candidate selected, 3 stopped by the applicability gate.
  - Of the 85 misses, 73 are also missed by the oracle, which judges only the gold lines. The judge, not focus, loses most violations.
  - The pipeline surfaces more than the oracle (407 vs 382). Extra context helps it.
- Clean outcomes (1,533): 16 false `violation` (1.0%) and 37 `review` (2.4%).
- Prior state-shape study (`.scratch/semantic-state-shapes/`): changing how state is encoded did nothing. Sending more scope traded accuracy for cost.

## Entries

### 1. Harness for holdout data

- **What:**
  - `SEMANTIC_EVAL_SPLIT` now takes a comma-separated list, so dev = `train,val` in one report.
  - `TestSemanticEvalWorkload` takes `SEMANTIC_EVAL_WORKLOAD` (a file list) and `SEMANTIC_EVAL_ROOT`.
  - Workload reports record each finding, so two runs over unlabeled files can be compared pair by pair.
- **Why:** the external holdout has no labels. Comparing findings between runs is the only way to measure accuracy on it.

### 2. External holdout sample

- **What:** 15 sibling projects, the first 4 eligible files each by SHA-256 order. Snapshot in `external/` (HEADs in `external/SOURCES.md`).
  - `external-a.txt` holds picks 1–2 (30 files). Use it for at most one mid-course check.
  - `external-b.txt` holds picks 3–4 (30 files). Use it only for the final check.
- **Why:** these projects are not in the corpus, which mostly comes from `repos/effect`. They differ in domain (React UI, CLI agents, Convex, infra) and are mostly not Effect code. Excluded vendored copies: `herd/vendor/effect` is the corpus's own source.
- **Dry-run candidate bytes:** workload 94.1 MB, ext-a 11.8 MB, ext-b 7.5 MB. About 30 policies per request in every set.

### 3. Where candidate bytes go (dry-run, free)

| Part | Share of candidate bytes (workload, ext-a, ext-b) |
| --- | --- |
| Source window | 6–7% |
| Candidate prompt prefix (889 B, repeated per policy) | ~52% |
| Policy text | ~41% |

- The prompt prefix is the largest cell. It is identical in every question of a request, yet it is billed once per policy, about 30 times per request.

### 4. Baseline (dev, packed, 3 seeded runs)

- Running `bin-base` (HEAD pipeline).

### E1 & E2 — shared guidance in state (pre-registered)

- **Hypothesis:** guidance shared by every question of a stage judges the same when it sits once in `state`, and it costs less.
- **Change:**
  - **E2 (candidate):** keep the question's first sentence. Move the other 778 bytes to `state.selection_guide`, and make the question say "Apply `selection_guide`."
  - **E1 (evidence):** keep the question sentence. Move the 123-byte answer guidance to `state.evidence_guide`.
  - Wording is byte-for-byte the default. Files: `variant-e1.json`, `variant-e2.json`. Mechanism: the `candidateGuide` and `evidenceGuide` prompt fields.
- **Predictions:**
  - E2: candidate bytes −42% (packed), production tokens about −14%. Candidate recall within noise.
  - E1: evidence bytes about −15%, production about −7%. Evidence recall within noise.
- **Risk:** the model may weigh text in state less than text in instructions, so it would select more or less. Watch `candidateRecall`, `evidenceRecall`, and later-stage tokens.

### 5. Baseline result (dev, packed)

| Run | Score | Surfaced | Precision | Candidate recall | Tokens (candidate / evidence / final) |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.9558 | 0.907 | 0.968 | 0.967 | 119.1 M (66.7 / 26.9 / 25.5) |
| 2 | 0.9545 | 0.904 | 0.965 | 0.964 | 118.7 M |
| 3 | 0.9535 | 0.896 | 0.961 | 0.964 | 118.8 M |

- Packed dev runs surface more violations than single-policy `val` runs (0.90 vs 0.83).
- Candidate is 56% of dev tokens. Corpus files are small, so this is not the 34% seen in production.

### 6. Offline analyses from the replay cache (free)

I rebuilt every dev candidate request, hashed it, and read the cached answer. Every request hit the cache, so threshold changes can be simulated exactly.

**Candidate cutoff** (seed 1; 335 violating cases; 184,228 candidate answers):

| Cutoff | Gold window selected | Answers selected (downstream load) |
| --- | --- | --- |
| 0.3 | 329 (98.2%) | 38,677 (+52%) |
| 0.4 (current) | 325 (97.0%) | 25,391 |
| 0.5 | 316 (94.3%) | 16,522 (−35%) |
| 0.6 | 307 (91.6%) | 10,687 (−58%) |

- This is a pure trade. Each 0.1 step buys about 1–3 points of recall for 35–50% of downstream load. No cutoff improves both, so **E3 is closed without a live run.**
- All 10 candidate misses are single-window files. Their gold windows scored 0.10–0.40. The selection prompt misses them; no window cut does.

**Final-stage noise:** the per-case final probability standard deviation across seeds is 0.012 (median 0.008); the oracle's is 0.007. Averaging two samples would cut noise by only about 0.004, which is far too little to move outcomes. **E4 (self-consistency) is closed by this power estimate.**

**Where score is lost** (mean loss 0.045 per case):

| Bucket | Share |
| --- | --- |
| Compliant files that `pass` with p ≈ 0.36 (calibration only) | 21% |
| Violations with no candidate (11 per run) | 19% |
| Violations judged `pass` (20 per run) | 15% |
| Compliant files reported `review` or `violation` (23 per run) | 18% |

**Evidence on small files:** in single-window corpus files, evidence keeps about 99% of lines, because blocks are at least 400 B and the files are under about 2 KB. On the corpus, evidence is nearly a no-op. Its value only shows on large real files.

**Dead constant:** `maximumWindowOverlapBytes` (2,000) never binds. `nextWindowStart` caps overlap at a quarter of the window, which is 1,000 B for a 4 KB window. The docs' "overlap by up to 2,000 bytes" is wrong; real overlap is at most 1 KB. A planned overlap experiment would have been a no-op, so it was dropped before running.

### 7. E1 & E2 results (dev, packed, 3 vs 3 paired)

| Metric | base | E1 (evidence guide) | E2 (candidate guide) |
| --- | --- | --- | --- |
| Score | 0.955 | 0.955 (n.s.) | 0.955 (n.s.) |
| Surfaced | 0.902 | 0.899 (n.s.) | 0.903 (n.s.) |
| Precision | 0.965 | 0.967 (n.s.) | 0.965 (n.s.) |
| Candidate recall | 0.965 | 0.965 | 0.969 (n.s.) |
| Tokens | 118.9 M | 117.6 M (**−1.1%**) | 84.9 M (**−28.5%**) |
| Verdict | — | better | better |

Stage tokens, seed 2:

| Stage | base | E2 |
| --- | --- | --- |
| Candidate | 66.7 M | 38.8 M (−42%; predicted −42%) |
| Evidence | 26.7 M | 23.4 M (−12%) |
| Final | 25.3 M | 22.8 M (−10%) |

- With guidance in state, E2 also selected fewer candidates (evidence questions −13%) without losing candidate recall.
- E1 saved less than predicted: −4% of evidence tokens vs −15%. Question text is a smaller part of evidence requests than I estimated, because the blocks dominate.
- **Both accepted on dev. Combined they are the new reference, `variant-e12.json`.**
- Two cases in E2 runs 1 and 3 failed with 429 (rate limit) and were excluded by the compare. From now on, one variant runs at a time.

### E9 — guides hold the whole question (pre-registered)

- **Hypothesis:** if the yes/no question itself also moves into the guide, the question only names its item ("Apply `selection_guide` to the following rule." / "Apply `evidence_guide` to `block_3`."). That saves about 100 B per candidate question and 120 B per evidence question, with judgments unchanged.
- **Prediction vs E12:** candidate −10%, evidence −5%, no metric worse.
- **Risk:** the Noul's instruction is no longer a question, so answers may lose their meaning. Watch candidate recall and the volume selected.

### Iteration 2 pre-registration (all on top of E12)

- **E12:** E1 + E2 together; this is the reference for iteration 2. **Prediction:** tokens about −29.5% vs base, accuracy the same.
- **E5 — evidence blocks of at least 800 B instead of 400 B.**
  - **Hypothesis:** half as many block questions cut evidence cost. Coarser blocks keep slightly more lines.
  - **Prediction:** evidence −25% on large files. Final up a little. Dev barely changes, because corpus files are under 2 KB and give 1–2 blocks either way. Must be confirmed on the external set.
  - **Risk:** less focus on large files. Watch planted cases.
- **E7 — the final request carries the policy once in `state.policy`; violation and applicability questions point at it.**
  - **Hypothesis:** this removes one of the two copies of the policy per final request.
  - **Prediction:** final −12 to −15%, accuracy the same. The earlier state-shape study saw final −15% with no accuracy change on single-policy `val`.
- **A1 — criteria on the final Noul.**
  - true: "breaks the rule as written, within its scope and exceptions"
  - false: "follows the rule, falls outside its scope or exceptions, or deciding needs code that is not shown"
  - **Hypothesis:** criteria for yes and no, like the applicability Noul already has, sharpen the verdict. Compliant `pass` cases at p ≈ 0.36 should move toward 0, and violations judged `pass` toward 1.
  - **Prediction:** score up by about 0.003. Precision and surfaced recall the same or up. Final tokens up about 3%.
  - **Overfit guard:** the wording is generic, comes from the existing final prompt, and was written before looking at any case text.

### 8. E9 result vs base (dev, 3 vs 3)

- Tokens 118.9 M → 76.0 M (**−36.1%**). Score 0.9546 → 0.9564 (n.s., CI [−0.000, 0.004]). Every gate metric shows no change. **Verdict: better.**
- A Noul whose instruction only says "Apply `selection_guide` to …", with the actual question in state, judges just as well.
- The E9 vs E12 comparison is pending the E12 runs.

### 9. Iteration 2 results (dev, 3 vs 3 against E12)

| Variant | Tokens | Score | Surfaced | Precision | Verdict |
| --- | --- | --- | --- | --- | --- |
| E12 | 83.95 M | 0.9547 | 0.8995 | 0.9669 | — |
| E9 (whole question in guide) | **−9.4%** | **0.9564 (better)** | 0.8985 | 0.9667 | better |
| E5 (blocks ≥ 800 B) | **−8.2%** | 0.9554 | 0.9045 | 0.9643 | better |
| E7 (final policy in state) | **−2.7%** | 0.9553 | 0.8826 (n.s., CI [−0.039, 0.003]) | 0.9737 | better |
| A1 (final criteria) | **+1.1% (worse)** | **0.9571 (better)** | **0.8806 (worse)** | **0.9838 (better)** | worse |

- E5 saved more on dev than predicted (−8% vs "barely"): evidence and final both shrank. The blocks were fewer and coarser, but evidence recall did not drop (0.966 → 0.969).
- **E7 and A1 both make the final judge more conservative:** precision goes up and surfaced recall goes down.
  - For A1 the drop is significant. AUROC improved (0.972 → 0.974), so ranking got better and the probabilities shifted down. Its "false" criterion includes "deciding needs code that is not shown", which pushes toward no.
  - For E7 the drift is not significant. It is accepted under the protocol, but I flag it to watch in the bundle and on holdout.
- **Decision:** accept E9, E5, and E7. Reject A1. Test A1b: the same criteria minus the "needs code not shown" clause, so the yes and no sides are symmetric.

### Iteration 3 pre-registration

E9 prompts, E5 (blocks ≥ 800 B), and E7 (final policy in state) are now the working-tree defaults. Together they are **B3**.

- **B3:**
  - **Prediction vs base:** tokens about −43%; no accuracy metric worse.
  - **Watch:** the surfaced-recall drift from E7.
- **A1b (on B3):** A1's criteria minus the "needs code not shown" clause, so yes and no are symmetric.
  - **Prediction:** score and AUROC better, as with A1. Surfaced recall not worse. Tokens +1%.
- **E10 (on B3):** candidate windows of 8 KB instead of 4 KB. Overlap goes from 1 KB to 2 KB.
  - **Hypothesis:** policy text is now about 75% of each candidate request and is repeated per window. Halving the windows on large files halves that repetition.
  - **Prediction:** candidate tokens −40% on multi-window files. Evidence goes up, because selected spans are wider. Dev total −3 to −8%, since only 152 of 1,240 dev cases span multiple windows.
  - **Risk:** dilution on planted cases, as in the whole-file study. Watch surfaced recall on `planted`.
- Test fix needed by B3: the variant growth check now compares stage totals (prompt + guide + criteria). The "5× length" test now inflates the candidate guide, and the final-request test identifies evidence requests by their `block_1` question.

### 10. Iteration 3 results

| Comparison | Tokens | Score | Surfaced | Precision | Verdict |
| --- | --- | --- | --- | --- | --- |
| base → **B3** | 118.9 M → 68.8 M (**−42.1%**, predicted −43%) | 0.9546 → 0.9572 (n.s.) | 0.9025 → 0.8925 (n.s.) | 0.9647 → 0.9748 (n.s.) | better |
| B3 → A1b | +1.1% (worse) | 0.9567 (n.s.) | 0.8806 (n.s.) | 0.9708 | worse; rejected |
| B3 → E10 (8 KB windows) | −7.2% | **0.9554 (worse)** | 0.8846 (n.s.) | 0.9744 | worse; rejected |

- **E10 repeats the state-shape lesson.** Wider candidate scope saves tokens but blurs the evidence, so score drops. 4 KB windows stay.
- **A1b:** symmetric criteria still lowered recall without raising score. Criteria on the final Noul are dropped as a lever.
- **B3 surfaced-recall drift:** −1.0 pp (n.s.), while precision is +1.0 pp and silent misses fell from 3.7% to 3.0%. E7 is the suspect, since it showed the same pattern alone.

### Iteration 4 pre-registration

- **Ablation B3−E7:** 6 vs 6 seeds against B3. Seeds 4–6 are new caches.
  - **Hypothesis:** E7 causes the surfaced-recall drift.
  - **Prediction:** B3−E7 surfaced recall is 1–2 pp higher, at +3% tokens.
  - **Decision:** if surfaced recall is significantly better, drop E7. Otherwise keep it.
- **A3 — compliance cross-check (on B3).** The final request also asks whether the spans *follow* the rule; the verdict is the mean of p(violation) and 1 − p(complies).
  - **Hypothesis:** two opposite framings make partly independent errors, so averaging reduces framing bias.
  - **Prediction:** AUROC and score better; surfaced and precision not worse; final tokens +5% (one more question that points at `policy`).

### 11. Iteration 4 results

| Comparison | Tokens | Score | Surfaced | Precision | Verdict |
| --- | --- | --- | --- | --- | --- |
| B3 → B3−E7 (6 vs 6) | +3.1% (worse) | 0.9569 → 0.9564 (n.s.) | 0.890 → 0.904 (n.s., CI [−0.009, 0.038]) | 0.974 → 0.969 (n.s.) | worse |
| B3 → A3 (compliance cross-check) | +1.4% (worse) | **0.9572 → 0.9543 (worse)** | 0.893 → 0.878 (n.s.) | 0.975 → 0.991 (n.s.) | worse; rejected |

- **E7 is kept, by the pre-registered rule.** Removing it is not significantly better on any metric and costs 3% more.
- But two independent experiments agree on direction: E7 alone was −1.7 pp surfaced, and the ablation is +1.35 pp. My best estimate is that E7 trades about 1.5 pp of recall for about 0.6 pp of precision. Flagged for the final report.
- **Pattern across A1, A1b, A3, and E7:** every change to the final request's framing (criteria, an opposing question, policy placement) made the judge *more conservative*. Precision rose, recall fell, and score did not improve. The final prompt is at a local optimum for framing tweaks. This matches issue 10, where GEPA on the final prompt found nothing. I am stopping framing experiments on the final stage.

### 12. Mid-course external check (ext-a), pre-registered

- **What:** base vs B3, packed workload over the 30 ext-a files, 3 seeds each.
- **Prediction:** tokens −35 to −45%. On discordant pairs, B3 is right at least as often as base.
- **Why now:** before more dev tuning, confirm that the B3 savings and accuracy carry over to code the corpus never saw. If they don't, dev results are overfit or unrepresentative, and the plan changes.

### 13. ext-a results: efficiency and discordance

| Stage | base tokens | B3 tokens | Change |
| --- | --- | --- | --- |
| Candidate | 2.57 M | 1.39 M | −46% |
| Evidence | 2.38 M | 1.57 M | −34% |
| Final | 1.80 M | 1.35 M | −25% |
| **Total (mean of 3)** | **6.75 M** | **4.34 M** | **−35.6%** (predicted −35 to −45%) |

- No file errors. Evidence questions fell from 11,209 to 5,154 because of the 800 B blocks.
- On external code the stage mix is evidence- and final-heavy (62% at base), unlike the corpus. So savings are smaller than on dev (−42%), but still large.
- **Outcomes over 2,911 (file, policy) pairs:**
  - surfaced by both: 88;
  - surfaced by neither: 2,765;
  - base only: 19;
  - B3 only: 39.
- B3 surfaces *more* on external code (127 vs 107 pairs), while on dev it surfaces slightly less. So the dev drift toward conservatism does not transfer. Whether the 39 extra are real violations or false alarms decides accuracy.
- I sent the 58 discordant pairs to two independent blind labelers each. They see only the file and the policy (`ext-a-label-items.json`).

### 14. ext-a discordance labels

- 58 discordant pairs, two blind labelers each.
- The labelers agree on violates vs not for 54 of 58 (93%); the other 4 are ambiguous and excluded.

| Direction | Labeled | Truly violating |
| --- | --- | --- |
| Base surfaces, B3 does not | 17 | 7 (B3 misses these) |
| B3 surfaces, base does not | 37 | 17 (B3 catches these) |
| **Right on discordant pairs** | base 27 / 54 | B3 27 / 54 |

- **Accuracy on unseen code is a tie (sign test p = 1). Cost is −35.6%.** B3 is non-inferior on external code and much cheaper, so the dev result generalizes.
- B3 trades differently on external code than on dev. It finds 10 more true violations and raises 10 more false alarms.
- **New finding:** on external code, only 24 of 54 discordant surfaced pairs (44%) are real violations. Dev precision is 0.97. The corpus very likely overstates real-world precision. Next, I label every surfaced pair on ext-a to measure precision by outcome (`violation` vs `review`) and by probability.

### E11 — skip evidence search for single-window spans (pre-registered)

- **Hypothesis:** for a selected span no larger than one candidate window (4 KB), the evidence round mostly re-reads the same text. Sending the span straight to final saves that request without diluting the judgment much, since E5's coarser blocks did not hurt.
- **Change:** `selectEvidence` keeps any span of at most `maximumSegmentBytes` whole, without asking. Larger, merged spans are still searched.
- **Prediction:**
  - dev: evidence −70%, final +10%, total −8%;
  - ext-a: evidence −60%, total −15%;
  - accuracy not worse.
- **Risk:** final sees up to 4 KB instead of the chosen blocks. Watch precision, and whether surfaced recall drops on planted cases.

### 15. E11 result

| Set | Tokens | Accuracy |
| --- | --- | --- |
| dev (3 vs 3 vs B3) | −7.3% | **score 0.9572 → 0.9546 (worse)**, precision worse, AUROC 0.9745 → 0.9709 (worse) |
| ext-a | −11.3% (evidence −35%, final +4%) | outcomes almost unchanged (2 / 1 pairs flipped) |

- **Rejected.** Skipping the evidence narrowing hurts the final judge measurably on dev, even within 4 KB.
- This is the third independent sign, after the state-shape `whole` study and E10, that **a focused final context is what buys accuracy.** Evidence narrowing is worth its cost; candidate breadth is not.
- E5 (800 B blocks) was neutral, so the useful granularity sits somewhere between 800 B blocks and one 4 KB window.

### 16. Real-world precision on ext-a

- **What:** I labeled every pair surfaced by both sides, 88 pairs with two blind labelers each. They agree on 79 (90%). Combined with the discordant labels, this covers every surfaced pair either side reported.

| Side | `violation` precision | `review` precision | All surfaced | True violations surfaced |
| --- | --- | --- | --- | --- |
| base | 38/44 = 0.86 | 33/52 = 0.63 | 71/96 = **0.74** | 71 |
| B3 | 45/54 = 0.83 | 36/62 = 0.58 | 81/116 = **0.70** | **81** |

B3 calibration on external code (median violation probability):

| Probability band | Real violations |
| --- | --- |
| 0.55–0.70 | 58% |
| 0.70–0.80 | 73% |
| 0.80–0.90 | 95% |
| 0.90+ | 100% |

- **On real code, precision is about 0.7–0.75, not the corpus's 0.97.** The corpus contrast cases are much easier than real files. This is the overfitting risk the holdout was meant to catch, and it applies to every pipeline, not only to my changes.
- Probabilities are well ordered, and the current cuts make sense: `review` is a coin flip plus, while `violation` is right about 85% of the time.
- B3 surfaces 10 more real violations at about the same precision (−4 pp, within noise). Combined with the tie on discordant pairs: non-inferior, leaning toward more recall.

### 17. Decision: freeze the bundle = B3 (E9 + E5 + E7)

- **Rejected:** E3 and E4 (offline), A1, A1b, A3, E10, and E11.
- **Accepted:** E9 ⊃ E1 + E2 (guides in state), E5 (800 B blocks), and E7 (final policy in state).
- **Remaining holdout checks, pre-registered:**
  1. **Corpus `test` split (465 cases), 3 vs 3:** no metric worse at the protocol levels; efficiency better.
  2. **ext-b (30 files), 3 vs 3:** tokens −30% or better; on discordant pairs, B3 right at least as often as base (two blind labelers).
  3. **Production workload (50 Effect files, 1 run each):** to report production-scale savings. The prediction is −35 to −45%. This is a cost measure, not a holdout.

### 18. Holdout results

**Corpus `test` split (465 cases, 94 violating), 3 vs 3:**

| Metric | base | B3 | 95/99% CI of the change | Verdict |
| --- | --- | --- | --- | --- |
| Score | 0.9367 | 0.9323 | [−0.011, 0.002] | no change |
| Precision | 0.950 | 0.919 | [−0.099, 0.004] | no change |
| Surfaced | 0.752 | 0.748 | [−0.069, 0.056] | no change |
| Silent misses | 0.106 | 0.142 | [−0.091, 0.016] | no change |
| AUROC | 0.917 | 0.903 | [−0.042, 0.015] | no change |
| Tokens | 65.8 M | 39.4 M | **−40.1%** | better |

- **Verdict: better** under the pre-registered rule. But unlike dev, every accuracy point estimate is slightly worse.
- On clean cases, false `review` rose from 1.7 to 8.7 per run (of about 370 clean cases). These flips cluster: 6 of 14 clean flips are cases of one policy, `test-observable-guarantees-not-private-structure`, whose final probabilities moved from about 0.45 to about 0.6.
- The effective sample is policies, not cases. A shift in one policy's calibration moves several cases together.

**ext-b (30 unseen files), 3 vs 3:**

- Tokens 3.97 M → 2.61 M (**−34.3%**).
- 51 discordant pairs; the two blind labelers agree on 46.
- Right on discordant pairs: **base 24, B3 22** (sign test p = 0.88). B3 found 12 extra real violations and raised 16 extra false alarms; it missed 8 that base found and avoided 10 false alarms.
- The pre-registered criterion was "B3 right at least as often as base". Read literally, it is missed by 2 pairs, but the difference is within noise.
- **Pooled with ext-a: base 51 vs B3 49 of 100.** Accuracy on unseen code is unchanged; cost is about −35%.

### E7 ablation on fresh data (ext-c), pre-registered

- **Why:**
  - E7 has the smallest saving (about 3%).
  - Its calibration effects point in different directions: more conservative on dev; more liberal on one policy family in `test`.
  - It is the prime suspect for the `test` drift. `test` cannot be used to decide, because that would leak the holdout, so I sampled fresh files.
- **Data:** ext-c, picks 5–6 per project (30 new files).
- **Runs:** base, B3, and B3−E7, 3 seeds each.
- **Decision rule:**
  - Drop E7 if, on B3 vs B3−E7 discordant pairs, B3−E7 is right more often with sign-test p < 0.10.
  - Otherwise keep E7.
- **Also recorded:** base vs B3 on ext-c, as a third external replicate.

### 19. ext-c results and the E7 decision

68 unique discordant pairs across the three comparisons; the two blind labelers agree on 62.

| Comparison (ext-c, 3 vs 3) | Tokens | Discordant | Right (left vs right) | Sign p |
| --- | --- | --- | --- | --- |
| base vs B3 | 5.73 M → 3.65 M (−36.4%) | 54 | base 29, B3 21 | 0.32 |
| B3 vs B3−E7 | 3.65 M → 3.72 M (+1.9%) | 58 | B3 23, B3−E7 30 | 0.41 |
| base vs B3−E7 | 5.73 M → 3.72 M (**−35.1%**) | **24** | base 11, B3−E7 10 | 1.00 |

- **E7 causes most of B3's behavior change on real code.** Without E7, the bundle disagrees with base on 24 pairs instead of 54, and is right equally often. With E7, B3 surfaces 38 extra pairs, of which only 18 are real violations.
- **Pre-registered rule:** drop E7 only if p < 0.10. Here p = 0.41, so the rule says *keep*.
- **Deviation, stated openly: I drop E7 anyway.** The reasons:
  1. All four looks at E7 lean the same way, though none is significant on its own:
     - dev: alone, surfaced −1.7 pp;
     - dev ablation: removing it gives surfaced +1.35 pp;
     - `test`: a policy-family calibration drift;
     - ext-c ablation: 30 vs 23 for removing it.
  2. It saves only about 2–3%.
  3. Dropping it moves the shipped pipeline *toward* the validated baseline. That is the conservative choice, not a tuned one, and it does not inflate any claimed accuracy gain.
  - I claim no accuracy gain from this decision.
- **Dev check, existing runs, base vs B3−E7:** tokens −40.3%. Every accuracy metric is the same or better (n.s.): score 0.9546 → 0.9564, surfaced 0.9025 → 0.9075, precision 0.9647 → 0.9656. **Verdict: better.**
- **Pooled external, base vs B3:** 80 vs 70 of 150. Base vs B3−E7 has only been measured on ext-c (a tie). One more confirmation runs on the corpus `test` split (B3−E7, 3 seeds) to complete the holdout record.

### 20. Production workload (50 Effect files, packed, 1 run each)

| Side | Tokens | Requests |
| --- | --- | --- |
| base | 35.38 M | 4,493 |
| B3 | 19.97 M (**−43.6%**) | 3,456 |

(Earlier in-repo workload numbers of about 51 M predate the policy retirements in `2e718c05a`.)

**Correction to entry 20:** the base and B3 workload runs ran in parallel, and 10 files in each failed with 429 (rate limit). Their totals undercount, so the −43.6% figure above is **void**. Clean reruns, one at a time with 0 errors, are in entry 21.

### 21. Shipped bundle: E9 + E5 (B3 without E7)

Code: `prompts.go` (selection and evidence guides), `batch.go` (`selection_guide` in candidate state; the dead `maximumWindowOverlapBytes` removed), `search.go` (800 B blocks; `evidence_guide` in evidence state).

Replaying dev seed 4 offline with the shipped code hits the replay cache for every request (0 billed tokens, identical score). So it is byte-identical to the measured `b3noe7` binary.

| Data | Tokens | Accuracy (base → shipped) |
| --- | --- | --- |
| dev `train`+`val` (1,240 cases, 3 vs 3) | 118.9 M → 71.0 M (**−40.3%**) | score 0.9546 → 0.9564; surfaced 0.9025 → 0.9075; precision 0.9647 → 0.9656 (all n.s.) |
| **holdout** `test` (465 cases, 3 vs 3) | 65.8 M → 40.3 M (**−38.7%**) | score 0.9367 → 0.9370; surfaced 0.752 → 0.762; precision 0.950 → 0.951 (all n.s.) |
| **holdout** ext-c (30 unseen files) | 5.73 M → 3.72 M (**−35.1%**) | discordant 24; right base 11 vs shipped 10 (p = 1.0) |
| Production workload (50 Effect files, 1 vs 1, 0 errors) | 44.24 M → 27.50 M (**−37.8%**) | no labels |

- **Conclusion:** semantic lint is now **35–40% cheaper with unchanged accuracy**, measured on dev, the corpus holdout, unseen external code, and the production workload.
- **Accuracy:** none of the six accuracy hypotheses survived (E3, E4, A1, A1b, A3, plus E7's calibration shift). The obvious remaining accuracy lever is not in the pipeline. On real code, precision is about 0.70–0.75, while the corpus reports 0.97. The judge, meaning the model plus policy wording, is the limit, and the corpus is too easy to steer it.

### Summary of every experiment

| Id | Change | Dev result | Fate |
| --- | --- | --- | --- |
| E1 | Evidence guidance in state | −1.1% tokens, accuracy = | Superseded by E9 |
| E2 | Candidate guidance in state | −28.5%, = | Superseded by E9 |
| E9 | The whole question in a guide; questions only point at it | −36.1% vs base, score better vs E12 | **Shipped** |
| E5 | Evidence blocks ≥ 800 B | −8.2%, = | **Shipped** |
| E7 | Final policy in state | −2.7%; recall↓, precision↑ (n.s.) | Dropped (entry 19) |
| E3 | Candidate cutoff | Pure trade (offline) | Rejected |
| E4 | Final self-consistency | Noise too low to matter (offline) | Rejected |
| A1, A1b | Final criteria | Recall worse, cost +1% | Rejected |
| A3 | Compliance cross-check | Score worse | Rejected |
| E10 | 8 KB windows | −7%, score worse | Rejected |
| E11 | Skip evidence for ≤ 4 KB spans | −7%, score worse | Rejected |

### Lessons

1. **Bill structure decides prompt layout.** TypeSafe bills state once and questions individually, so shared guidance belongs in state. Over all the experiments, this was the biggest win, and it cost no accuracy.
2. **Focus buys accuracy.** Every change that widened the final judge's context (the whole-file study, E10, E11) saved tokens and lost accuracy. Evidence narrowing earns its cost.
3. **Final-prompt framing is at a local optimum.** Every reframing shifted the precision/recall balance and none improved score.
4. **Corpus results do not transfer one-for-one.** Precision is 0.97 on the corpus but about 0.72 on real files. E7 looked neutral on dev and changed twice as many real-code outcomes. Effects cluster by policy, so the effective sample size is policies, not cases.

### What to do next

- **Make real-code accuracy the eval target.** Grow labeled external sets like the ones here, using two blind labelers per pair. Tune policy wording and thresholds there, then confirm on unseen external sets.
- **The `review` band (0.55–0.70) is right only about 60% of the time on real code.** Whether to keep surfacing it is a product decision for the maintainer.
- **Re-run GEPA** on `candidateGuide` with the updated script. It now models guide cost per request, not per question.

### Artifacts

- Reports: `~/.cache/better-typescript-evals/opt/` (`*-train+val-*`, `*-test-*`, `ext-*`, `workload-*`, `compare-*`); replay caches `cache-1`…`cache-6`, `ext-cache-*`, `wl-cache`.
- Variants: `variant-*.json`. Data: `external/`, `external-{a,b,c}.txt`. Labels: `ext-*-labels.json`. Discordance: `ext-*-discord*.json`.
- Scripts: `run.sh`, `queue.sh`, `compare.sh`, `ext.sh`, `discord.py`. The offline candidate probe is `probe_candidate_test.go.txt`; rename it to `_test.go` to use it.

## Follow-up: real-code eval set, then GEPA

### 22. External splits added to the corpus

- 265 blindly labeled external pairs became `real`-origin cases. Both labelers agreeing gives the gold label; a disagreement makes the case `ambiguous`. Gold lines are the union of both labelers' ranges. Five violations whose cited lines fell outside the file were demoted to `ambiguous`.
- **Splits:**
  - `ext-dev` (ext-a and ext-c): 214 cases, 116 violating;
  - `ext-test` (ext-b): 51 cases, 20 violating. This is the held-out split.
- Files live in `testdata/evals/external/`, with project HEADs in `sources.txt`.
- **Caveat:** the pairs are ones some pipeline variant surfaced, so the splits are enriched for borderline findings.
- **Shipped pipeline on these splits (packed, 3 seeds):**

| Split | Score | Surfaced | Precision | Candidate hit |
| --- | --- | --- | --- | --- |
| `ext-dev` | 0.783 | 0.70 | 0.72 | 0.99 |
| `ext-test` | 0.759 | 0.47 | 0.57 | 1.00 |

  The corpus splits score about 0.95.

### 23. GEPA on `final` + `candidateGuide`, selecting on `ext-dev`

- **Setup:** reflection on `train`, selection on 48 evenly spaced `ext-dev` cases, 1,500 metric calls, cost gate 1.3× using the shipped workload. No litellm key was available, so the reflection model was the harness `completion` model.
- **Every `final` proposal was rejected** (subsample 0.0): each exceeded the 4× length limit. Only `candidateGuide` was effectively explored.
- **Selection score:** 0.789 → 0.815, on the 48 selection cases only.
- **Confirmation, 3 vs 3 against shipped:**

| Split | Tokens | Score | Verdict |
| --- | --- | --- | --- |
| `test` (held out) | −7.6% | 0.9370 → 0.9368 | better |
| `ext-dev` + `ext-test` | −12.4% | 0.7785 → 0.7792 | better |

  No metric got worse on either.
- **The selection gain did not replicate**: on all of `ext-dev`, accuracy is flat. That is a selection-subset overfit, as expected with 48 cases. The real gain is efficiency: the new guide selects fewer spans with no recall loss.
- **Adopted** as the default `CandidateGuide`.

### Next

- Let GEPA explore `final`. Raise its length allowance, or have the reflection prompt state the byte limit more forcefully. Every `final` proposal was too long.
- Grow `ext-dev` by labeling a random sample of all pairs, not only surfaced ones. Recall on real code is still unmeasured.

## Round 3: recall on real code, GEPA on `final`

### 24. Random-sample labels

- **Sample:** 240 (file, policy) pairs drawn uniformly from the 8,328 unlabeled pairs of ext-a, ext-b, and ext-c, 80 per set. Two blind labelers each (`random-label-items.json`).
  - agreed: 236;
  - agreed violations: 6 (2.5%);
  - ambiguous: 4.
- **Added to the corpus** as `<policy>/external-random-<project>-<hash>`, using the same split rule (ext-b → `ext-test`). The external splits now hold 505 cases and are no longer surfaced-only.
- **Shipped pipeline on the random sample (3 seeds):**
  - surfaced 3 of 18 violation outcomes;
  - raised 4 false alarms on 690 clean outcomes (0.6%), none of them `violation`.
  - Four of the six real violations reached the final judge and were judged `pass`.
- **Estimated recall on real code (Wilson CI on prevalence):**
  - prevalence among unlabeled pairs 2.5% (95% CI 1.2–5.4%), about 212 hidden violations;
  - recall ≈ 93 true positives ÷ (93 + about 176 missed) ≈ **0.35 (range 0.17–0.49)**. The corpus says 0.90.
  - So real-code findings are fairly trustworthy (precision ≈ 0.72, false alarms ≈ 0.6% of pairs), but most real violations are missed, mostly by the final judge.

### 25. GEPA on `final` (pre-registered: adopt only if it is not worse on `test` and `ext-test`)

- **Length fix:** the reflection template now states a hard byte and word limit plus the current length. Proposals rejected for length fell from all of them to 10 of 30.
- **Setup:** reflection on `train`, selection on 117 evenly spaced `ext-dev` cases, 2,000 metric calls. Selection score 0.858 → 0.862.
- **Confirmation (3 vs 3 against shipped):**

| Split | Tokens | Score | Surfaced | Precision |
| --- | --- | --- | --- | --- |
| `test` | +2.5% (worse) | 0.9368 → 0.9341 (**worse**) | 0.770 → 0.734 (n.s.) | 0.951 → 0.962 (n.s.) |
| `ext-dev` (selection) | +2% | 0.867 → 0.867 | 0.702 → 0.813 (**better**) | 0.718 → 0.701 |
| `ext-test` (held out, 21 violating) | +2.5% | 0.899 → 0.903 (n.s.) | 0.444 → 0.635 (n.s., CI [−0.08, 0.46]) | 0.56 → 0.55 |

- **Rejected under the rule.** Corpus `test` score is worse, and the held-out real-code gain is not significant. Variant kept as `variant-gepa2.json`.
- **This is the most promising lead so far:** on real code it raised recall by 11–19 pp at nearly flat precision. The corpus pulls the other way, as with every final-framing change, because its contrast cases reward conservatism. Deciding it needs a larger `ext-test`: about 100 violating cases would resolve a 15 pp recall change.

## Round 4: enlarged `ext-test`

### 26. ext-d labels (60 new files, picks 7–10 per project)

- **What was labeled:** pairs surfaced by the shipped pipeline or by `variant-gepa2` (332, one seed each), plus 120 random unsurfaced pairs. Two blind labelers each.
- **All added to `ext-test`.** Violations: 178 surfaced + 3 random. `ext-test` now has about 200 violating cases.
- **Caveat:** most violations were found by one of the two compared sides, so absolute recall is inflated for both. The comparison is still symmetric.

### 27. `variant-gepa2` (final prompt) vs shipped on the enlarged `ext-test`, 3 vs 3

| Metric | Shipped | gepa2 | Change, 95/99% CI | Verdict |
| --- | --- | --- | --- | --- |
| Surfaced | 0.781 | 0.889 | [0.049, 0.171] | **better** |
| Precision | 0.768 | 0.813 | [−0.024, 0.117] | no change |
| Score | 0.8446 | 0.8460 | [−0.003, 0.006] | no change |
| AUROC | 0.844 | 0.861 | [−0.000, 0.035] | no change |
| Tokens | — | +2.4% | — | worse |

- The verdict rule says *worse*, only because of the cost.
- On the corpus `test` split, its score was 0.9368 → 0.9341, which counts as worse.
- **Adopting it needs a maintainer decision:** +11 pp recall on real code, precision not worse, +2.4% tokens, and a small regression on the synthetic corpus.
