# Add real and regression cases; human label pass

Category: task
Status: ready-for-human

v0 labels come from two Claude agents (κ 0.96 violates-vs-not, 0.80 three-way). Synthetic code is easier than real code.

## Do

- Human review of the 6 `ambiguous` cases and all `complies` vs `not-applicable` disagreements (`labels.blind` differs from `labels.author`).
- Sample real (file, policy) pairs from `repos/effect` and consumer repos; label with two model families plus a human tiebreak.
- Add GitHub #12 inputs as `regression` cases once the original files are confirmed.

## Acceptance

- [x] Every new case passes `TestEvalCorpusIsValid`.
- [x] κ per policy recorded; policies below 0.6 listed for rewriting, not prompt tuning.
- [ ] Human tiebreak on `label-review.md`.
- [ ] GitHub #12 regression cases.

## Comments

### 2026-10-05 — real cases sampled and model-labeled

- 84 (file, policy) pairs from 24 vendored Effect files (16 source, 8 test, 4 `tsconfig`), picked by SHA-256 order; workload and host files excluded. Split by file path. Files copied to `real/` with `sources.txt`.
- Labelers, blind: four Claude agents vs GPT-6.1-Sol. Violates-vs-not 75/84 (κ 0.47); three-way 71/84 (κ 0.73). 75 agreed cases kept; 9 disagreements stored as `ambiguous`.
- Four of the nine are `tsconfig` files whose extended base lacks `noUncheckedIndexedAccess`: the repository violates the policy, but the judged file cannot show it.
- Per-policy κ below 0.6: `keep-pure-calculations-pure` (three-way 0.26), `avoid-fixed-test-waits` (0.42), `control-test-nondeterminism` (0.45), `use-strict-runtime-specific-tsconfig-files` (0.48). The first three disagree on `complies` vs `not-applicable`; the last on cross-file evidence.
- Rebaseline (3 runs per split): `val` score 0.879, silent misses 8.9%; `test` 0.886, 15.8%. Real clean files: 0–2% false violations. Real violations: 8 scored, about half surfaced; too few to measure real-code recall.
- Human queue: `../label-review.md` (9 real, 31 synthetic).
- Regression cases: the GitHub #12 inputs are not in this repository; still open.
