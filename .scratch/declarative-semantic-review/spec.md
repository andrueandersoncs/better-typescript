# Declarative semantic review

Status: ready-for-agent

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
