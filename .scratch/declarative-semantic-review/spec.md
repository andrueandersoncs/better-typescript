# Declarative semantic review

Status: resolved

**Continue:** [Future-agent workflow](CONTINUE.md)

## Goal

Make `internal/semanticlint` declare its semantic work before interpreting it, while keeping every
result-shaped dependency explicit.

The governing analysis is
[`docs/jev-and-declarative-programming.md`](../../docs/jev-and-declarative-programming.md). Use the
shared vocabulary in [`CONTEXT.md`](../../CONTEXT.md): Policy, Evidence, Judgment, Finding, Review
plan, and Batch.

## Problem

`evaluateSemanticRule` currently mixes four concerns:

1. declaring possible domain, path, and hunk judgments;
2. interpreting those judgments;
3. selecting evidence from returned probabilities; and
4. constructing the final policy judgment from that selected evidence.

This makes accidental routing sequence look like an essential dependency. It also prevents the
complete known routing tree from being inspected before evaluation.

## Dependency model

| Stage | Structure | Reason |
| --- | --- | --- |
| Applicable policies | Pure | Paths and metadata determine membership. |
| Per-policy evaluation | Applicative | Policies are independent. |
| Domain → path → hunk routing | Selective | Every candidate branch is known before evaluation. |
| Per-hunk evidence expansion | Selective | Every possible expansion is deterministic. |
| Candidate relevance judgments | Applicative | Candidate judgments are independent. |
| Evidence ranking and selection | Pure | Fixed policy interprets returned probabilities. |
| Selected evidence → final judgment | Monad | Selected evidence constructs the later judgment state. |
| Probability → finding | Pure | Fixed thresholds determine classification. |

Physical request batching is an interpreter detail. TypeSafe request and token prices are not design
constraints for this effort.

## Solution

Introduce fixed, internal review stages rather than a general `Plan[T]`:

```text
Selective route plan
    ↓
Applicative relevance plan
    ↓
explicit selected-evidence stage
    ↓
final judgment plan
    ↓
pure finding policy
```

Each plan is ordinary inspectable data built by a pure constructor. Each interpreter consumes one
plan and returns a typed result. The orchestration names the selected-evidence transition directly;
it does not hide it in a callback or general `Bind` operation.

Start with concrete stage interfaces. Consider shared combinators only after all stages exist and
real duplication is visible.

## Shared-combinator decision

**Decision:** keep the concrete stages. Add no shared plan combinator.

### Evidence inventory

| Stage | Declared data | Interpretation behavior |
| --- | --- | --- |
| Route | A complete domain → path → hunk `routeChoice` tree | Evaluate only selected branches, recurse through buckets, rank the beam, and accumulate routing decisions and usage. |
| Relevance | One independent judgment per evidence candidate | Partition judgments by request size, evaluate every fitting partition concurrently, attach each Noul probability to its candidate, and merge usage. |
| Selected evidence | Ranked evidence plus `hasChanged` | Apply the relevance threshold, count and request-size limits, and retain the largest fitting prefix. No evaluator is involved. |
| Final judgment | One question built from `selectedEvidence` | Separate changed from supporting evidence, make one evaluation, validate one Noul answer, and return its probability and usage. |

`routeChoice[T]` is already the smallest proven reuse: domain, path, and hunk routing all use its
recursive bucketing and choice interpreter. Deleting it would duplicate real Selective behavior at
those three route levels. It remains route-specific.

Across stages, only request assembly, `evaluator.Evaluate`, answer-type checks, and usage conversion
look alike. The request states, cardinality, size handling, answer-to-result mapping, and error
semantics differ. These are evaluator protocol steps, not duplicated plan semantics.

### Applicative conclusion

A minimal shared interface was considered:

```go
type applicativePlan[T any] interface {
	requests(model string) []evaluationRequest
	collect([]evaluationResponse) (T, error)
}
```

A generic runner could evaluate the requests concurrently and pass the responses to `collect`.
Compared with the concrete code, this does not remove either stage's planning or interpretation:
relevance still owns partitioning and candidate-index mapping, while final judgment still owns its
single selected-evidence request and answer. It only wraps `evaluator.Evaluate`, exposes physical
request batching through the plan interface, and makes each caller know the generic runner
protocol. A generic `Map` or composition function would additionally turn typed stage transitions
into a callback DSL. The interface therefore increases total knowledge and fails the deletion test.

Per-policy evaluation and relevance judgments remain Applicative in behavior through direct
`concurrentMap` calls over independent values. Their result types and collection policies are not
shared.

### Selective conclusion

Selective reuse is proven only inside routing. The complete `routeChoice` tree exists before
evaluation, and its interpreter skips unselected branches. Relevance evaluates every declared
judgment; selection is pure; and the final plan cannot exist until `selectedEvidence` exists.
Treating that last dependency as another Selective branch would require enumerating evidence
subsets or hiding result-shaped plan construction. No shared Selective interface is justified.

A general Monad or `Bind` is rejected because the only result-shaped dependency is the named
`selectedEvidence` → final-plan transition, which must remain visible. Callback DSLs, exported
frameworks, and pass-through evaluator wrappers are also rejected: none has two callers sharing
planning or interpretation behavior, and each adds indirection without reducing caller knowledge.

The selected-evidence invariant remains explicit: `applyRelevancePolicy` produces
`selectedEvidence`; that value is the sole input to `buildFinalJudgmentPlan`; only its selected
changed and supporting evidence enters the final request; and no final judgment is made when it
contains no changed evidence.

## Required invariants

- The complete domain, path, hunk, and recursive bucket tree exists before routing evaluation starts.
- Known conditional routing uses Selective structure; it is not represented as result-shaped plan
  construction.
- Relevance questions are declared independently from their answers.
- Only selected changed and supporting evidence enters the final judgment state.
- A route with no changed evidence remains `not_applicable` and makes no final policy judgment.
- Missing review context retains the existing `insufficient_evidence` behavior.
- Routing decisions, beam scoring, canonical ordering, classifications, messages, and JSON output
  remain behaviorally compatible unless a later ticket explicitly changes them.
- Plan constructors perform no TypeSafe or repository I/O.
- Interpreters receive dependencies; they do not create clients.
- No exported planning interface is introduced until a second real caller requires one.

## Non-goals

- Reducing TypeSafe calls, tokens, latency, or price.
- Replacing Jev or TypeSafe.
- Changing policies, thresholds, routing semantics, beam width, or evidence limits.
- Enumerating every possible selected-evidence subset to simulate Applicative structure.
- Adding a general Monad, `Bind`, callback-based DSL, or public framework.
- Redesigning the semantic CLI or output format.

## Delivery order

1. [Extract the pure route plan](issues/01-extract-route-plan.md).
2. [Interpret the route plan selectively](issues/02-interpret-route-plan-selectively.md).
3. [Extract the relevance plan](issues/03-extract-relevance-plan.md).
4. [Expose the selected-evidence stage](issues/04-expose-selected-evidence-stage.md).
5. [Evaluate shared plan combinators](issues/05-evaluate-shared-plan-combinators.md).

Each ticket must leave the package simpler than it found it and remove the path it replaces.

## Completion criteria

- `evaluateSemanticRule` reads as composition of the five fixed stages.
- Route and relevance declarations are inspectable before their interpreters run.
- The selected-evidence dependency is visible in types and orchestration.
- No general planning abstraction exists without demonstrated reuse.
- Existing semantic behavior remains covered by the narrowest `_test.go` and `testdata/` cases.
- `docs/semantic-lint.md` describes any user-visible behavior change; no update is required for a
  behavior-preserving internal refactor.
- `./scripts/check.sh` passes after every ticket.

## Outcome

`evaluateSemanticRule` now composes concrete package-private stages:

1. `buildRoutePlan` → `interpretRoutePlan`
2. `buildRelevancePlan` → `interpretRelevancePlan`
3. `applyRelevancePolicy` → `selectedEvidence`
4. `buildFinalJudgmentPlan` → `interpretFinalJudgmentPlan`
5. `composeFinalFinding`

The route tree and relevance judgments are inspectable before evaluation. `selectedEvidence` is the
explicit result-shaped boundary and the only input to final-plan construction. No cross-stage plan
combinator was added: only the route-local `routeChoice[T]` has demonstrated reuse.
