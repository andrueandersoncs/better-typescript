# Semantic state shapes

Status: resolved

## Question

Does the shape of TypeSafe `state` change semantic lint accuracy and cost?

## Background

- Today `state` is a flat `map[string]string`.
  - Candidate: `{path, file}`, where `file` is a 4 KB slice and slices overlap by up to 2 KB.
  - Evidence: `{path, policy, block_1..n}`.
  - Final: `{path, file}`, where `file` is the spans joined into one string, each headed `[source lines a-b]`.
- Candidate and final put the policy text in each question's `instructions`. Final repeats it twice: once for violation, once for applicability.
- Cost model (live probe, 2026-10-10): TypeSafe bills `state` once per request, plus each question's text. Billed tokens are about request bytes ÷ 3.2.
- The candidate stage is about 74% of tokens (`val`, 2026-10-09).
- Accuracy is lost mostly at the final judgment: candidate recall 0.96, surfaced 0.81.
- The probe showed shape changes answers. With the policy moved into state, the same file scored 0.83 → 0.93 for violation and 0.49 → 0.85 for applicability.
- TypeSafe docs recommend a JSON object with named fields, and policies in state with questions pointing at them.

## Hypothesis

H1: at least one other state shape raises accuracy **and** cuts cost.

H0: no shape improves both.

## Variants (one factor each)

| Id | Factor | Change |
| --- | --- | --- |
| `base` | — | Current shape |
| `policy` | Policy placement | Every stage has `state.policy`; questions point at `policy` instead of carrying the policy text |
| `whole` | Scope | Candidate `state.file` is the whole file when it fits in one request; otherwise the current slices |
| `lines` | Addressing | Source text becomes `{lines: "a-b", text}`; final `file` is an array of those objects |

Prompt meaning, thresholds, and stages are held constant. Wording changes only where a field name must be referenced.

## Predictions

| Id | Cost | Accuracy |
| --- | --- | --- |
| `policy` | −3 to −5% (final no longer repeats the policy) | Up: the probe and the docs both favor it |
| `whole` | −20% or more (no overlap, one policy copy per file) | Same or up: the model sees full context; Jev keeps details in long requests |
| `lines` | +1 to +3% | Uncertain |

## Method

- `val` split, model `jev-1.13.0`, 3 fresh runs per side, no replay cache.
- Use `TestSemanticEvalCompare` for each variant against `base`.
- Production cost when policies are packed: free dry-run candidate bytes on `workload.txt`.
- Then test the variants that are not worse in combination, also 3 runs.

## Decision rule

- Support H1 only if a shape's compare verdict is `better`, with `score` not worse and `efficiency` better at 95%, and no gate metric worse at 99%.
- Otherwise keep H0 for that shape.
- Adopt a winner as the only shape, with no switch. Remove experiment scaffolding.

## Results

### Offline (free)

- The default shape sends byte-identical requests to HEAD: the dry-run JSON for the workload has the same SHA. So `base` runs are valid controls.
- Candidate-stage request bytes (≈ tokens × 3.2):

| Shape | `val` (one policy) | Workload (packed) |
| --- | --- | --- |
| `base` | 4.98 MB, 1,228 req | 94.1 MB, 1,842 req |
| `policy` | +1.1% | +1.8% |
| `whole` | −30.7%, 675 req | −19.9%, 1,461 req |
| `lines` | +0.6% | +0.1% |

### Live

`val`, 675 cases, `jev-1.13.0`, 3 runs per side, 0 errors. Run on 2026-10-10.

| Shape | Score | Surfaced | Silent miss | Tokens | Verdict |
| --- | --- | --- | --- | --- | --- |
| `base` | 0.943 | 82.7% | 5.5% | 2.09 M | — |
| `policy` | 0.940 (n.s.) | 81.5% (n.s.) | 6.1% (n.s.) | −0.8% (n.s.) | no-change |
| `whole` | 0.940 (n.s.) | 80.5% (n.s.) | 7.3% (n.s.) | **−7.2%** | better (cost only) |
| `lines` | **0.941, worse** | 81.5% (n.s.) | 6.5% (n.s.) | +0.6% (n.s.) | worse |
| `policy` + `whole` | **0.933, worse** | **76.6%, worse** | **10.0%, worse** | **−9.9%** | worse |

Why:

- `whole`: candidate tokens fell 32%, as predicted. But evidence tokens grew 119% (2,831 block questions vs 1,093) and final tokens grew 18%. Slices had been filtering for location. Without them, evidence must search the whole file.
- `whole` only changed large files. On planted cases, evidence grew from 59 to 157 lines per case, the mean violation probability fell from 0.76 to 0.72, and surfaced fell from 41.7 to 38.0 of 49. Contrast cases, which fit in one slice, were unchanged.
- `policy`: final tokens −15% and oracle −12%, but candidate +2%. The probe's big swing in answers did not hold across the corpus.
- `lines`: the structure added cost and gave nothing back.
- Encoding changes (`policy`, `lines`) left accuracy flat. Scope changes (`whole`) traded accuracy for cost.

## Conclusion

- H1 rejected for every tested shape. Keep H0: no shape improved both accuracy and cost.
- Kept the default shape. Experiment code was removed and archived in `shapes.patch`; apply it with `git apply` to rerun.
- Reports: `~/.cache/better-typescript-evals/2026-10-10/shape-*`, `compare-*`.

## Next hypothesis

Accuracy follows how focused the final evidence is, not how the state is encoded. Test narrower final context, for example smaller evidence blocks or a stricter evidence cutoff, against the same `base` runs.
