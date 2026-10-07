# Resolve overlaps, fix missing policies, measure every split

Category: enhancement
Status: resolved

Follow-ups from issue 07.

## Overlaps (maintainer: project rules win)

- Top-level project rules own their invariants: `if-statements` (retires `simplicity/keep-control-flow-shallow`), `mutability` (retires `modularity/give-each-piece-of-mutable-state-a-clear-owner`, `simplicity/do-not-mutate-inputs-unexpectedly`, `modularity/do-not-return-mutable-internal-state`), `expression-complexity` (retires `readability/name-complicated-conditions-and-intermediate-results`), `avoid-repetition` (retires `abstraction/separate-stable-behavior-from-required-variation`). `readability/name-things-by-their-purpose` no longer covers function names; `function-naming` does.
- `modularity/use-abstractions-at-meaningful-boundaries-not-everywhere` merged into `simplicity/let-abstractions-emerge-from-concrete-needs`. `readability/make-interfaces-understandable-at-the-call-site` leaves mode-selecting arguments to `abstraction/do-not-force-variation-through-flags`.
- Vague policies reworded into concrete invariants (maintainer review pending): `file-code-organization/avoid-pass-through-files`, `file-code-organization/keep-variants-of-one-thing-together`, `simplicity/prefer-direct-calls-over-hidden-dispatch`.
- 140 → 133 policies. Candidate questions on the workload: 63,242 → 58,944 (−7%).
- Cases of retired `keep-control-flow-shallow` moved to `if-statements`; `name-things` cases split with `function-naming`. Relabeled by Claude and GPT-6.1-Sol (52/54, κ 0.92); the two short-name disagreements follow the earlier `id` ruling.

## Policies that missed violations

Cause: the whole-file oracle also scored the violations low (0.15–0.48), so the wording, not span search, was at fault.

- `effect/separate-service-interfaces-from-layer-construction`: wording now names the three reportable shapes, and only per-call context (user, tenant, transaction) may stay in an operation's requirements (maintainer chose the strict boundary; the clean `pair-4` twin now obtains `AuditTrail` from its Layer). `val`+`test`, 3 runs: violations surfaced 0% → 100% (96% `violation`), clean files flagged 0%. Train: 100% surfaced. Three wordings were tried on these cases; the nuanced one surfaced 79%, mostly as `review`.
- `readability/name-things-by-their-purpose`: wording now gives the violation test (kind-only or misleading names). `val`+`test`: 0 → 1 of 2 violations surfaced; too few cases to judge.

## Measuring every split

- 251 authored files for the 39 split policies without cases: one contrast pair per successor policy plus a not-applicable file per parent; 6 files for the reworded policies. Author vs GPT-6.1-Sol: 956/1,028 labels (κ 0.79); a blind Claude reviewer settled all 72 violation disagreements by majority.
- Before: the pre-split catalog (`4aa7952f9`) judged each file by its old parent. After: the current catalog judged it by every successor; a file's outcome is its most severe successor outcome. 233 files whose gold agrees on both sides (90 violating, 143 clean), 3 runs per side, paired bootstrap 95%:

| Metric | Before | After | 95% interval | Verdict |
| --- | --- | --- | --- | --- |
| Surfaced | 63.0% | 83.0% | +11.9 to +28.9 pts | better |
| Flagged `violation` | 29.6% | 51.5% | +12.6 to +31.5 pts | better |
| Silent misses | 37.0% | 17.0% | −28.9 to −11.5 pts | better |
| False `violation` on clean files | 2.1% | 2.3% | −2.8 to +3.5 pts | no change |
| `review` on clean files | 5.1% | 16.1% | +6.1 to +16.3 pts | worse |

- More policies per file means more chances for one borderline `review` on clean code.

## Corpus

1,493 cases, 108 policies. 25 of 133 policies still have no cases.

Reports: `~/.cache/better-typescript-evals/2026-10-02/`: `{val,test}-clean-{1,2,3}.json` (baseline after relabel), `fix-b4-{1,2,3}.json` (final service wording), `fix-b-{1,2,3}.json` (naming), `c-before-{1,2,3}.json`, `c-after-{1,2,3}.json`.
