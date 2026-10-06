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
- [x] Human tiebreak on every disagreement.
- [ ] GitHub #12 regression cases.

## Comments

### 2026-10-05 — real cases sampled and model-labeled

- 84 (file, policy) pairs from 24 vendored Effect files (16 source, 8 test, 4 `tsconfig`), picked by SHA-256 order; workload and host files excluded. Split by file path. Files copied to `real/` with `sources.txt`.
- Labelers, blind: four Claude agents vs GPT-6.1-Sol. Violates-vs-not 75/84 (κ 0.47); three-way 71/84 (κ 0.73). 75 agreed cases kept; 9 disagreements stored as `ambiguous`.
- Four of the nine are `tsconfig` files whose extended base lacks `noUncheckedIndexedAccess`: the repository violates the policy, but the judged file cannot show it.
- Per-policy κ below 0.6: `keep-pure-calculations-pure` (three-way 0.26), `avoid-fixed-test-waits` (0.42), `control-test-nondeterminism` (0.45), `use-strict-runtime-specific-tsconfig-files` (0.48). The first three disagree on `complies` vs `not-applicable`; the last on cross-file evidence.
- Rebaseline (3 runs per split): `val` score 0.879, silent misses 8.9%; `test` 0.886, 15.8%. Real clean files: 0–2% false violations. Real violations: 8 scored, about half surfaced; too few to measure real-code recall.
- Human queue: 9 real, 31 synthetic.
- Regression cases: the GitHub #12 inputs are not in this repository; still open.

### 2026-10-06 — human tiebreak

Asked as 13 questions instead of 52 rows; answers recorded in `labels.human`.

- Violations: `toCodec.ts` (generic `Error` throws), `regenerate.ts` (raw PostgreSQL fields in errors, even in a maintainer script).
- Not violations: `WorkflowProxy.ts` (`group.add` copy lives in another file), `HttpClient.test.ts` (route never completes, so the timeout always fires), `AtomRpc.test.ts`, `listAccounts`, `invoicesForCustomer`, docgen sequential writes.
- `renderProfile` (pair 4) violates, which left the pair without a complying side; its complying file now keeps `ProfileAbsent` in the error channel.
- `complies` vs `not-applicable`: broad reading. A clean file that has anything the policy could govern `complies`. 36 disputes resolved; 10 flipped to `complies`. The six authored `na-*` cases that flipped are now `single-*`; the validator requires pairs and gold lines only for paired cases and contrast violations.
- `use-strict-runtime-specific-tsconfig-files` removed entirely (policy, 20 cases, files).
- Rebaseline, 414 cases, 3 runs per split: `val` score 0.879, silent misses 9.1%, precision 0.95, applicability AUROC 0.98; `test` 0.882, 19.2%, 0.87, 0.96. Not comparable to earlier reports (different corpus). Seed reports: `{val,test}-human-{1,2,3}.json`.
- `regenerate.ts` passes in all runs: a real violation the linter misses.
- Not relabeled: cases both labelers already called `not-applicable` under the narrow reading. Some may be `complies` under the broad one.
