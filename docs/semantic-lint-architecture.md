# Semantic lint architecture

`better-typescript semantic` evaluates complete files against whole-file policies.

See [Semantic lint](./semantic-lint.md) for command usage.

## Vocabulary

| Term | Meaning | Main Go type |
| --- | --- | --- |
| **Policy** | Markdown rule answerable from one complete file | `Rule` |
| **File** | Complete selected file contents | `Source` |
| **Question** | One Noul asking whether the file violates one policy | `question` |
| **Partition** | One size-bounded request containing independent questions | `requestPartition` |
| **Finding** | Probability classified as pass, review, or violation | `Finding` |

## Flow

```text
Git paths
   │
   ▼
complete files ──► glob and config selection ──► one Noul per policy
                                                    │
                                                    ▼
                                        size-bounded partitions
                                                    │
                                      concurrent TypeSafe requests
                                                    │
                                                    ▼
                                              findings
```

`command.go: Run` owns the flow.

For every file, the TypeSafe state is exactly:

```json
{"file":"<complete contents>"}
```

Every policy produces exactly one question:

```text
Does the `file` violate the following rule?

Rule:
<verbatim rule file>
```

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

`batch.go` constructs all applicable questions before evaluation.

Questions are added in catalog order until another question would exceed 32,000 encoded bytes. The next partition then begins. All partitions for a file run concurrently. Findings are restored to catalog order.

The complete file is present in every partition. If the file and one policy cannot fit, evaluation fails before an API call. No truncation or chunking is allowed.

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
