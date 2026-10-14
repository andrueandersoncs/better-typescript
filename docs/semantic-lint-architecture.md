# Semantic lint architecture

`better-typescript semantic` evaluates selected files against file-scoped policies.

See [Semantic lint](./semantic-lint.md) for command usage.

## Vocabulary

| Term | Meaning | Main Go type |
| --- | --- | --- |
| **Policy** | Markdown rule answerable from one file | `Rule` |
| **File** | Complete selected file contents | `Source` |
| **Span** | Overlapping source range for candidate selection | `sourceWindow` |
| **Block** | Whole-line slice of a selected span, at least 800 bytes, judged as evidence | `sourceWindow` |
| **Candidate** | Selected source range that may matter, not proof | `CandidateRange` |
| **Evidence scope** | Whether selected context covers the whole file or only part | `Finding.EvidenceScope` |
| **Question** | Noul for candidates, evidence blocks, applicability, and verdicts | `question` |
| **Partition** | Size-bounded request over a span, a policy's blocks, or its evidence set | `requestPartition` |
| **Finding** | Final verdict or inconclusive outcome with candidate ranges | `Finding` |

## Flow

```text
Git paths → complete files → path-matched policies
                               │
                               ▼
                  overlapping source spans
                               │
                               ▼
                 candidate Nouls per span/policy
                               │
                               ▼
               merge selected spans per policy
                               │
                               ▼
               whole-line blocks of selected spans
                               │
                               ▼
              evidence Nouls per block (policy stated
              once per request)
                               │
                               ▼
                assemble evidence set
                               │
                               ▼
               two independent Nouls per policy:
               applicability and violation
                               │
                               ▼
             findings with selected context and scope
```

`command.go: Run` owns the flow. Selection, evidence, and final judgment are separate evaluation stages, each one round of concurrent requests. Final questions are built only after block Nouls produce an evidence set.

Every TypeSafe request includes the selected file's project-relative `path`. Selection requests also provide `file` with a source span and `selection_guide`; evidence requests provide `policy`, `evidence_guide`, and `block_1` … `block_n`; final requests provide labeled original spans under `file`. Text shared by every question of a selection or evidence request lives once in state, because TypeSafe bills state once per request but question text once per question; each question only points at it. The two final questions still carry the policy text themselves: moving it into state saved about 2% but shifted final calibration on real code (`.scratch/semantic-lint-optimization/journal.md`). Two independent Nouls judge applicability and violation over the same evidence set; a review or violation needs applicability of at least 0.70. A violation probability within 0.05 of the threshold triggers one more round that asks the same final request four more times; the five answers are averaged. No source is truncated: an unselected policy passes without a final probability, while an absent evidence set, unestablished applicability, or oversized combined context is inconclusive without a final violation probability.
Applicability judges whether the policy's subject is present, regardless of compliance; violation separately judges whether selected spans establish a concrete breach. Unrelated compliant code does not negate that breach.

## Selection

`evidence.go` selects paths from:

- working-tree changes by default;
- the end commit of `--range`;
- current files matched by `--files`; or
- every eligible current file with `--all`.

Deleted files are skipped. Every retained path is read completely.

`rules.go` copies the embedded defaults on `semantic init`, loads project policies, preserves the complete Markdown source, parses frontmatter globs, and applies ordered semantic-mode configuration commands per file.

## Requests

`batch.go` builds selection partitions from line-aware spans of at most 4,000 encoded source bytes. Consecutive spans overlap by a quarter of a span, at most 1,000 bytes. Questions for each span are packed in policy order until the 64,000-byte request limit (TypeSafe allows 64k tokens per request).

Each candidate Noul applies `selection_guide` to one policy: could its span supply concrete violation evidence or necessary context? Scores above 0.40 select candidates. Overlapping or adjacent selected spans merge. `search.go` cuts each selected span into whole-line blocks of at least 800 bytes and asks one short Noul per block; the policy and `evidence_guide` sit once in the request state. Blocks scoring above 0.40 merge into the evidence set. A span of one block is kept without asking, and a block that cannot fit in a request stays whole rather than being truncated. All policies' evidence requests run in one round. The final Nouls ask whether that combined context proves applicability and violation of the *original* file; they must answer no when omitted context is needed. Narrowing to evidence blocks matters: sending whole spans or whole files to the final Nouls was cheaper but measurably less accurate (`.scratch/semantic-lint-optimization/journal.md`). At most eight requests run concurrently in each round. Findings remain in policy order.

`--dry-run` describes selection partitions only: final requests depend on selection answers. A policy that leaves no room for source text fails before an API call. No source is truncated.

The `evaluator` interface remains the transport seam:

```go
type evaluator interface {
    Evaluate(context.Context, evaluationRequest) (evaluationResponse, error)
}
```

`typesafe.go` owns authentication, `.env` fallback, HTTP, retries, timeouts, and Noul response validation.

## Classification

| Final probability or selection outcome | Classification |
| --- | --- |
| No candidate selected | `pass` (no final probability) |
| No evidence block selected, or selected context exceeds one request | `inconclusive` (no final probability) |
| Applicability < 0.70 for a potential finding | `inconclusive` (no violation probability) |
| Final `≤ 0.55` | `pass` |
| Final `> 0.55` and below `--threshold`, with applicability ≥ 0.70 | `review` |
| Final at or above `--threshold`, with applicability ≥ 0.70 | `violation` |

The default violation threshold is `0.70`; applicability uses a fixed `0.70` gate. The `0.55` review floor was set from eval reports: reviews scoring `0.40`–`0.55` were real violations 31–43% of the time, those above `0.55` 64–70%. Identical final requests vary by about ±0.05, so scores within `0.05` of the threshold are the mean of five answers, rounded to two decimals. A candidate-free policy is a `pass`: on four real files, all 254 such policies also passed a full-file final judgment. Evals still count a violating case with no candidate as a silent miss. `evidenceScope` is `file` only for a single range covering every source byte; otherwise selected ranges are `localized`. It is absent when no context was selected. Candidate ranges may be distant and are leads, not proven defects or generated rationales. Inconclusive findings do not fail the run; reviews are informational and only violations fail.

## File map

| File | Responsibility |
| --- | --- |
| `command.go` | Options, orchestration, exit codes, output |
| `types.go` | Data model, request encoding, limits |
| `evidence.go` | Git selection and complete file reads |
| `rules.go` | Policy loading, verbatim source, glob and config selection |
| `prompts.go` | Every instruction and criterion sent to TypeSafe |
| `batch.go` | Request partitioning, concurrent evaluation, classification |
| `search.go` | Evidence blocks and multi-span evidence sets |
| `typesafe.go` | TypeSafe HTTP adapter and Noul validation |
| `semanticlint_test.go` | Behavioral coverage |
| `eval_test.go`, `eval_live_test.go` | Accuracy and efficiency evals |

## Evals

Evals score prompt variants so they can be optimized without guessing.

- Corpus: `testdata/evals/cases/<policy>.jsonl`. Each case is one file, one policy, a gold label, and gold lines. `planted` cases insert a violation into a large real host from `testdata/evals/hosts/`; `real` cases judge unchanged files from `testdata/evals/hosts/` or `testdata/evals/real/`. Cases whose labelers disagree are `ambiguous` and unscored until a human decides.
- `go test ./internal/semanticlint` validates the corpus offline.
- Live runs use build tag `semanticeval` and need `TYPESAFE_API_KEY` or a full replay cache. `eval_live_test.go` lists the commands and inputs.
- Each request carries an unsent `scope` naming its stage (`candidate`, `evidence`, `final`), its round, and its source window or blocks. Evals read it to attribute misses, tokens, and rounds to a stage.
- `TestSemanticEvalCases` writes per-case scores, stage hits, tokens, and feedback; `SEMANTIC_EVAL_SPLIT` takes a comma-separated list, and `SEMANTIC_EVAL_PACKED=1` asks every matching policy, as production does. `TestSemanticEvalWorkload` measures cost on `testdata/evals/workload.txt`, or on another list via `SEMANTIC_EVAL_WORKLOAD` and `SEMANTIC_EVAL_ROOT`, and records every finding so two runs over unlabeled files can be compared pair by pair. `TestSemanticEvalCompare` averages repeated runs per side and bootstraps the difference. Decide with at least three runs per side: single runs of identical prompts disagree often. Runs that share a replay cache seed get identical answers for identical requests, which narrows the noise in a comparison.
- Cost: `efficiency.inputTokens` is the production cost the `efficiency` metric compares. `billedInputTokens` is what the run itself cost TypeSafe: pipeline plus oracle requests, excluding replay-cache hits. Both are logged per run. Single-policy eval cases understate how policy text grows production requests, which pack every matching policy; use packed runs, or compare the free dry-run candidate-stage total before and after: `better-typescript semantic --dry-run --json --files "$(paste -sd, internal/semanticlint/testdata/evals/workload.txt)" | jq '[.files[].partitions[].requestBytes] | add'`.
- Variants: every live run refuses a prompt variant whose evidence prompt lacks `{block}`, whose stage (prompt, guide, and criteria together) is over four times its default length, or that quotes corpus text, titles, strings, or corpus-only code names. The failure starts with `variant rejected:`. `scripts/semantic_gepa.py` (GEPA) scores a rejected variant 0, stops on any other failure, and can also reject variants whose estimated workload cost exceeds a set ratio.
- Corpus results overstate real-code results: the `train`/`val`/`test` splits score about 0.95, while real code scores about 0.85. The `ext-dev` and `ext-test` splits hold real files from other projects (`testdata/evals/external/`), blindly labeled by two labelers. Most cases are pairs some pipeline variant surfaced; `external-random-*` cases are a uniform random sample of all pairs, and `external-oss-*` cases a stratified sample of open-source pairs (estimated real-code recall and precision both about 0.58). **Real code is the primary acceptance gate:** accept on `ext-test` and treat corpus splits as a regression check, not a veto. `scripts/semantic_gepa.py` scores class-balanced cases (a plain mean rewards lowering every probability), treats cost only as a gate, reflects on `train` plus one half of `ext-dev` (`ext-dev:1`), and selects on all of the other half (`ext-dev:2`).

## Reading order

1. `command.go: Run`
2. `types.go: Source`, `Rule`, and `Finding`
3. `batch.go: buildRequestPartitions` and `evaluateSource`
4. `search.go: selectEvidence` and `evidenceRequest`
5. `evidence.go: loadSelectedSources`
6. `rules.go: parseRule` and `rulesForPath`
7. `typesafe.go: typeSafeClient.Evaluate`
