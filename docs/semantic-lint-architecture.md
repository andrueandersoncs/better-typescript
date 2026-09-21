# Semantic lint architecture

`better-typescript semantic` turns repository evidence and Markdown policies into deterministic findings.

Use this page to read `internal/semanticlint`. See [Semantic lint](./semantic-lint.md) for command usage.

## Vocabulary

| Term | Meaning | Main Go type |
| --- | --- | --- |
| **Policy** | Natural-language engineering requirement | `Rule` |
| **Evidence** | Bounded repository fact or source snippet | `Evidence` |
| **Review plan** | Decisions declared before evaluation | `routePlan`, `relevancePlan`, `finalJudgmentPlan` |
| **Routing** | Narrows changed files to likely relevant hunks | `routeExecution[routedHunk]` |
| **Expansion** | Adds imports, importers, tests, config, and nearby conventions | `[]Evidence` |
| **Relevance** | Scores each evidence candidate independently | `interpretedRelevance` |
| **Judgment** | Probability that selected changed evidence violates one policy | `interpretedFinalJudgment` |
| **Finding** | Stable classification returned to the caller | `Finding` |

## Whole command

```text
Run (command.go)
    │
    ▼
Git snapshot ──► RepositoryEvidence ──► load and select policies
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
            deterministic            review, no context       semantic lane
            exact Go check       insufficient_evidence    route and judge
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             ▼
                                      FindingReport
                                             │
                                             ▼
                                    human text or JSON
```

`command.go: Run` owns this orchestration. It is the best entry point.

## Semantic lane

Each applicable policy runs independently. The implementation preserves declaration order when it assembles findings and traces.

```text
RepositoryEvidence
        │
        ▼
route domain
        │
        ▼
route path
        │
        ▼
route hunk
        │
        ▼
expand related evidence
        │
        ▼
score relevance
        │
        ▼
selected changed evidence?
        ├── no  ──► not_applicable
        │
        └── yes ──► final violation probability
                         ├── ≤ 0.40       ──► pass
                         ├── < threshold  ──► review
                         └── ≥ threshold  ──► violation
```

### 1. Route

`buildRoutePlan` creates a tree:

```text
domain
└── path
    └── hunk
```

`interpretRoutePlan` walks that tree with TypeSafe Choice questions.

- One candidate is selected automatically.
- Multiple candidates call the `evaluator` interface.
- Each level keeps at most three probable branches.
- `none` stops that branch.
- `--speculative-routing` changes scheduling, not selection rules.

### 2. Expand

`expandEvidence` starts from routed hunks and adds bounded context:

```text
candidate inputs
    ├── routed patch
    ├── enclosing source chunk
    ├── imported dependencies
    ├── importers
    ├── matching tests
    ├── owning configuration
    ├── same-directory peers       (repository policies only)
    └── optional review context
                    │
                    ▼
           evidence candidates
```

`repositoryRelations` computes imports, importers, matching tests, and owning configuration once per run. `expandEvidence` reuses that map for every policy.

### 3. Filter relevance

`buildRelevancePlan` declares one independent Noul question per candidate. `interpretRelevancePlan` evaluates them. `applyRelevancePolicy` then:

1. sorts by relevance probability;
2. keeps probabilities at or above `0.45`;
3. keeps at most six candidates; and
4. trims until the final request fits.

No selected changed evidence means `not_applicable`. Supporting repository context alone cannot become the reported candidate.

### 4. Judge and classify

`buildFinalJudgmentPlan` declares one Noul question: does the selected changed evidence violate this policy?

`composeFinalFinding` converts its probability into a stable classification:

| Probability | Classification |
| --- | --- |
| `≤ 0.40` | `pass` |
| `> 0.40` and below `--threshold` | `review` |
| At or above `--threshold` | `violation` |

The default violation threshold is `0.70`.

## Evaluator seam

Routing, relevance, and final judgment all depend on one small interface:

```go
type evaluator interface {
    Evaluate(context.Context, evaluationRequest) (evaluationResponse, error)
}
```

```text
plans and interpreters
          │
          ▼
      evaluator
          ├──► batchedEvaluator ──► typeSafeClient
          ├──► speculativeRouteEvaluator ──► batchedEvaluator
          └──► test evaluator
```

This is the main seam:

- `routing.go` decides what to ask and interprets answers.
- `batch.go` combines byte-identical state with independent questions.
- `typesafe.go` owns HTTP, authentication, retries, timeouts, and response validation.
- `speculative.go` starts known route branches early and cancels rejected work.

## Safety limits

The limits live together in `types.go`.

| Limit | Value | Purpose |
| --- | ---: | --- |
| Request size | 32,000 bytes | Bounds every TypeSafe request |
| Evidence snippet | 6,000 bytes | Prevents one source from consuming a request |
| Choice options | 16 including `none` | Bounds each routing question |
| Routing beam | 3 | Bounds retained alternatives |
| Expanded candidates | 12 | Bounds relevance work |
| Selected evidence | 6 | Bounds final judgment context |
| Source chunk | 80 lines, 20 overlap | Makes full-file selection routable |
| HTTP timeout | 10 seconds | Bounds one attempt |
| HTTP retries | 2 | Retries timeouts, rate limits, and server failures |

Every plan is validated in `plan_capabilities.go` before evaluation. Invalid identities, parent relationships, question types, ordering, probabilities, or sizes fail the run instead of silently changing meaning.

## Data transformations

```text
repositorySnapshot
        │
        ▼
RepositoryEvidence
        │
        ▼
routePlan ──► routeExecution[routedHunk]
        │
        ▼
[]Evidence ──► selectedEvidence ──► Finding ──► FindingReport
```

The report is an observable contract. `execution_metadata.go` attaches question provenance and produces canonical trace events without copying source snippets into provenance.

## File map

| File | Responsibility |
| --- | --- |
| `command.go` | Options, orchestration, exit codes, output |
| `types.go` | Shared data model, request encoding, hard limits |
| `evidence.go` | Git snapshots, ranges, selected files, diffs, source chunks |
| `rules.go` | Embedded and local policy loading, metadata, glob matching |
| `deterministic.go` | Exact repository checks implemented in Go |
| `routing.go` | Plans, routing, expansion, relevance, final classification |
| `plan_capabilities.go` | Plan validation, dry-run inspection, cost bounds |
| `batch.go` | Request packing and answer demultiplexing |
| `typesafe.go` | TypeSafe HTTP adapter and response validation |
| `speculative.go` | Optional concurrent route evaluation and cancellation |
| `execution_metadata.go` | Provenance and canonical trace events |
| `fixture.go` | Test fixture loading |
| `semanticlint_test.go` | End-to-end behavior examples |
| `plan_capabilities_test.go` | Plan, validation, and trace examples |

## Reading order

1. `command.go: Run` — see the whole command.
2. `types.go: Rule`, `RepositoryEvidence`, `Evidence`, `Finding` — learn the data shapes.
3. `routing.go: evaluateSemanticRule` — see one policy move through every stage.
4. `evidence.go: buildRepositoryEvidence` and `routing.go: expandEvidence` — see what can reach TypeSafe.
5. `plan_capabilities.go`, `batch.go`, and `typesafe.go` — see validation and transport safeguards.

For a concrete run, use `--dry-run --json` to inspect declared routing plans without API calls. Use `--trace --json` on a live run to connect each question, decision, evidence id, and finding.