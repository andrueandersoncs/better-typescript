# Search evidence for policies concurrently

Category: enhancement
Status: resolved

`evaluateSource` called `selectEvidence` for one policy after another, so sequential rounds were 1 + Σ route depth + 1. Measured (issue 01): up to 302 rounds per workload file; 64–256 KB files took 107 s median.

## Acceptance

- [x] Workload `rounds` drop to 1 + max route depth + 1 per file; wall time drops.
- [x] Replaying the baseline cache yields identical case outcomes and tokens (comparison `no-change`, 0 flips).
- [x] Concurrency stays bounded by the 40 requests/s rate limit; `./scripts/check.sh` passes.

## Answer

2026-10-02. `selectEvidence` now advances every policy one split level per round in a single `evaluatePartitions` call (still at most 8 requests in flight). Rounds are observed, not derived: `evaluateSource` numbers each wave in `requestScope.round`.

Replay of the baseline cache: 0 of 172 `val` cases differ; workload tokens (62,791,468) and requests (58,882) identical, all cached. Max rounds 302 → 10, median 96 → 8. Issue 06 then cut rounds to 3. Wall time was not measured separately; the issue 06 workload run took 23 s with the candidate stage replayed.
