# Cut evidence search cost

Category: enhancement
Status: resolved

Issue 01: Choice search (`route`) was 82.6% of workload tokens and 96% of requests, about 61 requests per judged file-policy pair, each repeating the full policy text. In 6 `val` runs it never dropped gold lines that candidate selection found. Replay analysis: evidence kept 81% of selected bytes (median), and 48% of search requests went to pairs that ended inconclusive because their evidence never fit one final request.

## Acceptance

- [x] Workload input tokens drop; record the new `byStage` shares.
- [x] `val`, 3 runs per side: no metric `worse`; evidence recall holds.
- [x] `docs/semantic-lint-architecture.md` describes the new search; `./scripts/check.sh` passes.

## Answer

2026-10-02. Maintainer chose block scoring. `search.go` cuts each selected span into whole-line blocks of at least 400 bytes and asks one short Noul per block; the policy is stated once per request in `policy`. A one-block span is kept without asking. All policies' evidence requests run in one round. Choice questions are gone (prompts, answer type, validation, tests).

| Measure | Choice search | Block scoring |
| --- | --- | --- |
| Workload tokens | 62.8 M | 20.6 M (−67%) |
| Workload requests | 58,882 | 3,947 |
| Search stage | 51.9 M / 56,719 requests | 9.5 M / 1,817 requests |
| Max rounds per file | 302 (10 after issue 03) | 3 |
| `val` tokens per run | 1.20 M | 1.03 M |
| `val` score (6 vs 3 runs) | 0.855 | 0.854; no metric worse, efficiency better |
| Evidence lines per finding (median / mean) | 19 / 27 | 25 / 46 |

Reports: `~/.cache/better-typescript-evals/2026-10-02/val-blocks-{1,2,3}.json`, `workload-blocks.json`, `compare-blocks.json`.
