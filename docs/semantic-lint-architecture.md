# Semantic lint architecture

`better-typescript semantic` evaluates selected files against file-scoped policies.

See [Semantic lint](./semantic-lint.md) for command usage.

## Vocabulary

| Term | Meaning | Main Go type |
| --- | --- | --- |
| **Policy** | Markdown rule answerable from one file | `Rule` |
| **File** | Complete selected file contents | `Source` |
| **Span** | Overlapping, line-aware source range for candidate selection | `sourceWindow` |
| **Candidate** | Selected span that could demonstrate a violation; not proof | `CandidateRange` |
| **Question** | One Noul selecting a candidate span or judging selected spans | `question` |
| **Partition** | Size-bounded request over one span or one policy's merged candidates | `requestPartition` |
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
               two independent Nouls per policy:
               applicability and violation
                               │
                               ▼
           gate verdict on applicability ≥ 0.70
                               ▼
            findings with candidate source ranges
```

`command.go: Run` owns the flow. Candidate selection and final judgment are separate evaluation stages. The final request is built only after selection answers arrive.

Each selection request uses `{"file":"<source span>"}`. Final requests use the same key with labeled original source spans. Two independent Nouls judge applicability and violation; a review or violation needs applicability of at least 0.70. There is no source truncation; an unselected policy, unestablished applicability, or oversized combined context is inconclusive without a final violation probability.

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

Each candidate Noul asks whether its span could supply concrete violation evidence or necessary context. Scores above 0.40 select candidates. Overlapping or adjacent selected spans merge before the final request. The final request asks independently whether the policy applies to the selected behavior and whether their combined context proves that the *original* file violates the policy; it must answer no when omitted context is necessary. A potential review or violation is inconclusive unless applicability scores at least 0.70. At most eight partitions run concurrently in each stage. Findings remain in policy order.

`--dry-run` describes selection partitions only: final requests depend on selection answers. A policy that leaves no room for source text fails before an API call. No source is truncated.

The `evaluator` interface remains the transport seam:

```go
type evaluator interface {
    Evaluate(context.Context, evaluationRequest) (evaluationResponse, error)
}
```

`typesafe.go` owns authentication, HTTP, retries, timeouts, and Noul response validation.

## Classification

| Final probability or selection outcome | Classification |
| --- | --- |
| No candidate, selected context exceeds one request, or applicability < 0.70 for a potential finding | `inconclusive` (no violation probability) |
| Final `≤ 0.40` | `pass` |
| Final `> 0.40` and below `--threshold`, with applicability ≥ 0.70 | `review` |
| Final at or above `--threshold`, with applicability ≥ 0.70 | `violation` |

The default violation threshold is `0.70`. Applicability uses a fixed `0.70` gate and its probability is included in JSON when evaluated. Candidate ranges locate source used by the final judgment, not proven defects. Inconclusive findings do not fail the run; reviews and violations do.

## File map

| File | Responsibility |
| --- | --- |
| `command.go` | Options, orchestration, exit codes, output |
| `types.go` | Data model, request encoding, limits |
| `evidence.go` | Git selection and complete file reads |
| `rules.go` | Policy loading, verbatim source, glob and config selection |
| `batch.go` | Exact questions, request partitioning, concurrent evaluation, classification |
| `typesafe.go` | TypeSafe HTTP adapter and Noul validation |
| `semanticlint_test.go` | Behavioral coverage |

## Reading order

1. `command.go: Run`
2. `types.go: Source`, `Rule`, and `Finding`
3. `batch.go: buildRequestPartitions` and `evaluateSource`
4. `evidence.go: loadSelectedSources`
5. `rules.go: parseRule` and `rulesForPath`
6. `typesafe.go: typeSafeClient.Evaluate`
