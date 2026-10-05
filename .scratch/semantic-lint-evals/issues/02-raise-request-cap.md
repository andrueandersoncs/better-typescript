# Send each span once by raising the request cap

Category: enhancement
Status: resolved

`maximumRequestBytes` (32,000) split 76 policy questions into two requests per span. The API allows 64k tokens per request.

## Acceptance

- [x] Comparison verdict is not `worse` on any accuracy metric.
- [x] Workload candidate requests halve.
- [x] `docs/semantic-lint-architecture.md` states the new limit; `./scripts/check.sh` passes.

## Answer

2026-10-02. `maximumRequestBytes` is 64,000. It bounds candidate, evidence, and final requests.

| Measure (default prompt) | 32,000 | 64,000 |
| --- | --- | --- |
| `val` / `test`, 3 vs 3 | — | `no-change` (test `applicabilityAuroc` better) |
| Workload requests | 3,947 | 3,024 |
| Candidate stage | 8.3 M tokens / 1,228 requests | 7.5 M / 614 |
| Evidence stage | 9.5 M / 1,817 | 9.4 M / 1,352 |
| Final stage | 2.8 M / 902 | 4.5 M / 1,058 |
| Workload tokens | 20.6 M | 21.4 M (+4%) |

Tokens rise slightly because larger evidence sets now fit one final request: 156 more file-policy pairs get a verdict instead of `inconclusive` for size. Reports: `~/.cache/better-typescript-evals/2026-10-02/{val,test}-cap-{1,2,3}.json`, `workload-cap.json`.
