# Semantic lint architecture

`better-typescript semantic` evaluates selected files against file-scoped policies.

See [Semantic lint](./semantic-lint.md) for command usage.

## Vocabulary

| Term | Meaning | Main Go type |
| --- | --- | --- |
| **Policy** | Markdown rule answerable from one file | `Rule` |
| **File** | Complete selected file contents | `Source` |
| **Window** | Overlapping contiguous file range used when a file and policy cannot fit one request | `sourceWindow` |
| **Question** | One Noul asking whether its scope proves that the file violates one policy | `question` |
| **Partition** | One size-bounded request containing independent questions over one scope | `requestPartition` |
| **Finding** | Highest policy probability classified as pass, review, or violation | `Finding` |

## Flow

```text
Git paths
   │
   ▼
complete files ──► glob and config selection ──► candidate policy scopes
                                                    │
                                                    ▼
                                        size-bounded partitions
                                                    │
                                      up to 8 concurrent requests
                                                    │
                                                    ▼
                                      maximum probability per policy
                                                    │
                                                    ▼
                                              findings
```

`command.go: Run` owns the flow.

For policies that fit, the TypeSafe state remains exactly:

```json
{"file":"<complete contents>"}
```

An oversized file-policy pair uses the same `file` key with one window's text. Whole-file questions require a negative answer when the policy subject is absent or inapplicable to the shown code shape. Window questions add the same applicability guard and require a negative answer when omitted context is necessary.

There are no routing, relevance, evidence-expansion, deterministic, speculative, or review-context stages.

## Selection

`evidence.go` selects paths from:

- working-tree changes by default;
- the end commit of `--range`;
- current files matched by `--files`; or
- every eligible current file with `--all`.

Deleted files are skipped. Every retained path is read completely.

`rules.go` loads embedded and project policies, preserves the complete Markdown source, parses frontmatter globs, and applies ordered semantic-mode configuration commands per file.

## Requests

`batch.go` constructs all candidate questions before evaluation.

Each policy first attempts the complete file. Fitting policies keep whole-file semantics and are packed in catalog order. Policies that do not fit use windows sized against the largest candidate encoded question. Windows prefer line boundaries and overlap by up to 2,000 source bytes.

Questions are packed until another would exceed 32,000 encoded bytes. At most eight partitions run concurrently. Window answers for the same policy are reduced to their maximum probability, then findings are restored to catalog order.

A policy that leaves no room for source text fails before an API call. Files and policies are never truncated.

The `evaluator` interface remains the transport seam:

```go
type evaluator interface {
    Evaluate(context.Context, evaluationRequest) (evaluationResponse, error)
}
```

`typesafe.go` owns authentication, HTTP, retries, timeouts, and Noul response validation.

## Classification

| Probability | Classification |
| --- | --- |
| `≤ 0.40` | `pass` |
| `> 0.40` and below `--threshold` | `review` |
| At or above `--threshold` | `violation` |

The default violation threshold is `0.70`.

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
