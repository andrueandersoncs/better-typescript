# Add real and regression cases; human label pass

Category: task
Status: ready-for-human

v0 labels come from two Claude agents (κ 0.96 violates-vs-not, 0.80 three-way). Synthetic code is easier than real code.

## Do

- Human review of the 6 `ambiguous` cases and all `complies` vs `not-applicable` disagreements (`labels.blind` differs from `labels.author`).
- Sample real (file, policy) pairs from `repos/effect` and consumer repos; label with two model families plus a human tiebreak.
- Add GitHub #12 inputs as `regression` cases once the original files are confirmed.

## Acceptance

- [ ] Every new case passes `TestEvalCorpusIsValid`.
- [ ] κ per policy recorded; policies below 0.6 listed for rewriting, not prompt tuning.
