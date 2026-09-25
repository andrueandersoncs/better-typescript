# Semantic lint architecture

`better-typescript semantic` evaluates selected files against file-scoped policies.

See [Semantic lint](./semantic-lint.md) for command usage.

## Vocabulary

| Term | Meaning | Main Go type |
| --- | --- | --- |
| **Policy** | Markdown rule answerable from one file | `Rule` |
| **File** | Complete selected file contents | `Source` |
| **Span** | Overlapping source range for candidate selection or hierarchical search | `sourceWindow` |
| **Candidate** | Selected source range that may matter, not proof | `CandidateRange` |
| **Question** | Noul for candidates/verdicts or Choice for search branches | `question` |
| **Partition** | Size-bounded request over a span, branch, or policy's evidence set | `requestPartition` |
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
                 Choice over source halves:
                 left, right, both, neither
                               │
                               ▼
                assemble evidence set
                               │
                               ▼
               two independent Nouls per policy:
               applicability and violation
                               │
                               ▼
             findings with selected source ranges
```

`command.go: Run` owns the flow. Selection, hierarchical search, and final judgment are separate evaluation stages. Final questions are built only after Choice routing produces an evidence set.

Selection requests use `{"file":"<source span>"}`. Routing requests use `{"left":"<source half>","right":"<source half>"}`. Final requests use labeled original source spans under `file`. Two independent Nouls judge applicability and violation over the same evidence set; a review or violation needs applicability of at least 0.70. No source is truncated: an unselected policy, absent evidence set, unestablished applicability, or oversized combined context is inconclusive without a final violation probability.

## Selection

`evidence.go` selects paths from:

- working-tree changes by default;
- the end commit of `--range`;
- current files matched by `--files`; or
- every eligible current file with `--all`.

Deleted files are skipped. Every retained path is read completely.

`rules.go` loads embedded and project policies, preserves the complete Markdown source, parses frontmatter globs, and applies ordered semantic-mode configuration commands per file.

## Requests

`batch.go` builds selection partitions from line-aware spans of at most 4,000 encoded source bytes. Spans overlap by up to 2,000 source bytes. Questions for each span are packed in policy order until the 32,000-byte request limit.

Each candidate Noul asks whether its span could supply concrete violation evidence or necessary context. Scores above 0.40 select candidates. Overlapping or adjacent selected spans merge. `search.go` splits each candidate around line boundaries, then asks a Choice per branch pair. Its options cover left, right, both, and neither. Marginal probability for each side includes `both`; it retains sides within a factor of two rather than committing to one winning path. A `neither` score of at least 0.80 drops the pair. Search stops around 400 source bytes per leaf and merges selected leaves into an evidence set. A branch that cannot fit in a Choice request stays whole rather than being truncated. The final Nouls ask whether that combined context proves applicability and violation of the *original* file; they must answer no when omitted context is needed. At most eight requests run concurrently in each stage. Findings remain in policy order.

`--dry-run` describes selection partitions only: final requests depend on selection answers. A policy that leaves no room for source text fails before an API call. No source is truncated.

The `evaluator` interface remains the transport seam:

```go
type evaluator interface {
    Evaluate(context.Context, evaluationRequest) (evaluationResponse, error)
}
```

`typesafe.go` owns authentication, HTTP, retries, timeouts, and Noul/Choice response validation.

## Classification

| Final probability or selection outcome | Classification |
| --- | --- |
| No candidate, no evidence branch selected, or selected context exceeds one request | `inconclusive` (no final probability) |
| Applicability < 0.70 for a potential finding | `inconclusive` (no violation probability) |
| Final `≤ 0.40` | `pass` |
| Final `> 0.40` and below `--threshold`, with applicability ≥ 0.70 | `review` |
| Final at or above `--threshold`, with applicability ≥ 0.70 | `violation` |

The default violation threshold is `0.70`; applicability uses a fixed `0.70` gate. Candidate ranges may be distant and are leads, not proven defects or generated rationales. Inconclusive findings do not fail the run; reviews are informational and only violations fail.

## File map

| File | Responsibility |
| --- | --- |
| `command.go` | Options, orchestration, exit codes, output |
| `types.go` | Data model, request encoding, limits |
| `evidence.go` | Git selection and complete file reads |
| `rules.go` | Policy loading, verbatim source, glob and config selection |
| `batch.go` | Exact questions, request partitioning, concurrent evaluation, classification |
| `search.go` | Choice routing and multi-span evidence sets |
| `typesafe.go` | TypeSafe HTTP adapter and Noul/Choice validation |
| `semanticlint_test.go` | Behavioral coverage |

## Reading order

1. `command.go: Run`
2. `types.go: Source`, `Rule`, and `Finding`
3. `batch.go: buildRequestPartitions` and `evaluateSource`
4. `search.go: selectEvidence` and `routeBranches`
5. `evidence.go: loadSelectedSources`
6. `rules.go: parseRule` and `rulesForPath`
7. `typesafe.go: typeSafeClient.Evaluate`
