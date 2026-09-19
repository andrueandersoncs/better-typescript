Yes. The deepest connection is probably not pattern matching alone. It is:

> **A Jev workflow is naturally a declarative, typed query program whose independent parts form an Applicative computation.**

That explains batching, speculative questions, typed answers, interpretation, and when another request is genuinely required.

## 1. Questions form a small declarative language

Imagine the TypeSafe primitives as a Haskell GADT:

```haskell
data Question a where
  Noul
    :: Predicate
    -> Question Probability

  Choice
    :: NonEmpty (a, Meaning)
    -> Question (Distribution a)

  Score
    :: NonEmpty Level
    -> Question (Distribution Level)
```

A program describes judgments without executing them:

```haskell
review :: Semantic Finding
review =
  buildFinding
    <$> noul removesSafeguard
    <*> noul addsAccidentalComplexity
    <*> choice changeKind
```

The declaration is pure. An interpreter later:

1. collects the questions;
2. serializes the shared state;
3. batches compatible questions;
4. calls Jev;
5. validates typed answers;
6. passes the results to `buildFinding`.

This is classic declarative programming:

```text
description of computation
            │
            ▼
planner / interpreter
            │
            ▼
external execution
```

SQL has a query planner. Parser combinators have a parser interpreter. A Jev DSL would have a System One interpreter.

## 2. The key Haskell connection: Applicative versus Monad

### Applicative

With `Applicative`, the complete computation structure is known before execution:

```haskell
result =
  combine
    <$> questionA
    <*> questionB
    <*> questionC
```

None of those questions depends on another answer. Therefore the interpreter can inspect and execute all three together.

That is exactly TypeSafe’s rule:

> Questions over the same state are independent and should be sent together.

See [Primitives: ask multiple questions together](https://docs.typesafe.ai/primitives.md#ask-multiple-questions-together).

This is not merely an optimization. It is a property of the program’s structure:

```text
Applicative structure known statically
→ questions can be collected
→ requests can be batched
→ costs can be estimated
→ plans can be inspected
→ execution can be parallelized
```

### Monad

With `Monad`, the next computation may depend on an earlier value:

```haskell
route >>= \selected ->
  fetchEvidence selected >>= \evidence ->
    judge evidence
```

The second request cannot be constructed until the first answer exists.

That maps directly to TypeSafe’s guidance: another request is warranted only when an earlier answer determines new state, fetches new evidence, or determines the next option set.

```text
Applicative:
  ask A, B, C over one state

Monad:
  ask A
  use A to construct a new state
  ask B over that new state
```

The current semantic linter uses monadic sequencing much more than necessary:

```text
route domain
→ route path
→ route hunk
→ fetch context
→ judge rule
```

Some of those dependencies are real. Others may be accidental consequences of the implementation.

## 3. Selective functors may be the exact middle ground

Haskell’s `Selective` abstraction sits between Applicative and Monad.

It supports conditional computations whose possible branches are known statically:

```haskell
ifS isBugReport
    inspectBugSeverity
    inspectFeatureRequest
```

An interpreter may:

- execute only the selected branch; or
- evaluate both branches speculatively and discard the unused result.

That is almost exactly TypeSafe’s [speculative fan-out](https://docs.typesafe.ai/patterns/fan-out.md):

```text
Ask:
  ticket category
  bug severity
  refund requested
  frustration

Then:
  use bug severity only for bug reports
  use refund requested only for billing
```

The questions are declaratively available, while code decides which answers matter.

So the hierarchy is:

| Abstraction | TypeSafe workflow |
|---|---|
| `Functor` | Transform one typed answer |
| `Applicative` | Batch independent questions over shared state |
| `Selective` | Declare conditional questions; execute eagerly or selectively |
| `Monad` | Construct new state/questions from earlier answers |

That feels like the genuinely deep connection.

## 4. Pattern matching emerges from typed distributions

Traditional pattern matching chooses a constructor:

```haskell
case request of
  Refund orderId -> ...
  Exchange orderId size -> ...
  Complaint message -> ...
```

Jev can infer a probability distribution over constructors:

```text
Refund    0.76
Exchange  0.18
Complaint 0.05
Other     0.01
```

A Choice is therefore approximately:

```haskell
state -> Distribution Constructor
```

The application then performs ordinary pattern matching:

```haskell
case mostLikely distribution of
  Refund
    | confidence > threshold -> processRefund

  Exchange
    | confidence > threshold -> processExchange

  _ -> requestHumanReview
```

TypeSafe’s [function-calling cookbook](https://docs.typesafe.ai/cookbooks/function_calling.md) demonstrates this shape:

1. Choice selects a function constructor.
2. Other questions bind its closed-set arguments.
3. Code pattern-matches on the selected function.
4. Code calls the ordinary typed implementation.

Jev is not performing the effect. It is producing the typed value on which normal code dispatches.

## 5. Noul is a probabilistic semantic predicate

A Noul resembles a predicate:

```haskell
type Predicate a = a -> Bool
```

Except its codomain is probabilistic:

```haskell
type SemanticPredicate a = a -> Probability
```

For example:

```haskell
removesSafeguard
  :: SemanticPredicate Change

introducesSpeculativeAbstraction
  :: SemanticPredicate Change

duplicatesDecisionLogic
  :: SemanticPredicate SourceFile
```

These predicates can overlap. Therefore they should be evaluated independently rather than represented as competing Choice constructors.

```haskell
matches =
  SemanticMatches
    <$> removesSafeguard change
    <*> introducesSpeculativeAbstraction change
    <*> duplicatesDecisionLogic change
```

The result is not one classification. It is a record of reusable semantic facts:

```text
removesSafeguard                  0.91
introducesSpeculativeAbstraction 0.84
duplicatesDecisionLogic          0.12
```

Policy remains ordinary code:

```haskell
when (removesSafeguard >= 0.8) reportViolation
when (addsComplexity >= 0.5 && addsComplexity < 0.8) requestReview
```

Do not treat these probabilities as Boolean algebra. For example, $P(A \land B)$ is not generally $P(A)P(B)$ unless the assumptions justify independence. If the conjunction itself has meaning, ask it directly or keep the signals separate.

## 6. Candidate selection behaves like pattern binding

Traditional matching both selects a constructor and binds values:

```haskell
case observation of
  ImportEdge source target -> ...
```

For unstructured data:

1. code discovers possible bindings;
2. Jev selects which candidate has the semantic role;
3. code binds the exact candidate.

```haskell
candidates :: [SourceSpan]
selected   :: Distribution SourceSpan
```

That is the architecture in TypeSafe’s [pre-parsed value extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md):

```text
regex/parser finds candidates
→ Choice selects a candidate
→ code copies and normalizes it
```

It is semantic destructuring without permitting the model to invent bound values.

## 7. Jev as a logic-programming interpreter

There is also a Datalog/Prolog-like interpretation:

```text
Observed facts:
  file path
  diff
  imports
  configuration
  test relationship

Semantic predicates:
  change removes safeguard
  abstraction lacks demonstrated need
  name obscures purpose

Rules:
  if predicate probability exceeds policy threshold
  then produce finding
```

The difference from classical logic programming:

- facts remain deterministic;
- semantic predicates are probabilistic;
- inference policy remains explicit in code;
- effects happen after interpretation.

This gives a useful three-layer model:

```text
Hard facts
    │
    ▼
Soft semantic predicates
    │
    ▼
Deterministic policy and effects
```

Jev should own only the middle layer.

## 8. A free Applicative would provide operational leverage

A free Applicative stores the question program as data before interpreting it.

Conceptually:

```haskell
type Semantic = Ap Question
```

That allows multiple interpreters:

```haskell
runJev       :: State -> Semantic a -> IO a
runFixture   :: Fixture -> Semantic a -> Either Error a
inspectPlan  :: Semantic a -> Plan
estimateCost :: Semantic a -> Cost
listQuestions :: Semantic a -> [QuestionMetadata]
```

Because the whole plan is inspectable before execution, the implementation can:

- combine questions over identical state;
- split requests at model limits;
- deduplicate identical questions;
- cache individual judgments;
- show a dry-run plan;
- record exact question provenance;
- test composition without HTTP;
- compare model versions;
- reject accidental sequential dependencies.

That would make batching structural instead of the current 1 ms opportunistic coalescing.

## 9. Purity belongs to the declaration, not the model call

The remote call is not referentially transparent:

- network failures exist;
- model aliases can change;
- sampling may vary;
- service versions evolve.

But the query declaration can still be pure:

```haskell
program :: Semantic Finding
```

Only interpretation enters `IO`:

```haskell
runSemantic
  :: ModelVersion
  -> StateSnapshot
  -> Semantic a
  -> IO (Judged a)
```

For reproducibility:

- pin a model version when results must be stable;
- hash the state and question declaration;
- retain raw probabilities;
- cache or record responses;
- distinguish observed state from inferred answers.

`jev-latest` is convenient operationally but cannot provide long-term referential transparency.

## Goal for `semanticlint`

Classify every dependency in the semantic review pipeline:

- **Applicative** when independent judgments are known before execution;
- **Selective** when all possible judgments are known but earlier answers decide which matter;
- **Monad** when an earlier answer constructs the state of a later judgment;
- **Pure** when no semantic judgment is required.

The goal is structural clarity, not request or token savings. TypeSafe pricing is not a design
constraint here.

## Current dependency graph

```text
repository snapshot
    │
    ├─ pure: match and partition policies
    │
    └─ Applicative: evaluate applicable policies independently
           │
           └─ for each policy
                  │
                  ├─ Selective: domain → path → hunk routing
                  │
                  ├─ Selective: expand evidence for selected hunks
                  │
                  ├─ Applicative: judge candidate relevance
                  │
                  ├─ pure: threshold, rank, and select evidence
                  │
                  ├─ Monad: selected evidence → final policy judgment
                  │
                  └─ pure: probability → finding
```

The classifications follow the current symbols:

| Code | Classification | Reason |
| --- | --- | --- |
| `Run` policy matching and evaluator partitioning | Pure | Paths, metadata, and review context determine the result. |
| `evaluateSemanticRules` | Applicative | Every applicable policy evaluation is independent. |
| `routeRuleHunks` domain, path, and hunk stages | Selective | The complete candidate tree already exists. Parent answers only decide which known child branches run. |
| `routeOptionsAny` bucket recursion | Selective | Every bucket and member question is derivable before evaluation. Answers only gate descent. |
| `expandEvidence` | Selective | Expansion for every possible hunk is deterministic. Routing chooses among those known expansions. |
| `selectRelevantEvidence` questions | Applicative | Every candidate receives an independent Noul judgment. |
| Relevance threshold, ranking, and limit | Pure | Ordinary code derives selected evidence from returned probabilities. |
| `finalRequest` | Monad | Its changed and supporting evidence state is constructed from the selected evidence returned by the previous stage. |
| `classificationFromProbability` | Pure | A fixed threshold maps the final probability to a classification. |
| `batchedEvaluator` | Interpreter detail | It changes physical request packing, not the program's dependency structure. |

Missing review context and a route that selects no changed evidence are Selective short-circuits.
Their possible outcomes are known before execution.

## Essential and accidental dependencies

### Accidental

The current implementation waits for each routing answer before constructing the next request.
That sequencing is not required by the domain:

- every domain is known from changed paths;
- every path is known from the repository snapshot;
- every hunk is known from the diff;
- every bucket tree is deterministic;
- every per-hunk evidence expansion is deterministic.

Those branches can be declared up front. A Selective plan can retain the current gating semantics.
An Applicative interpreter could evaluate every branch speculatively.

### Essential

The final policy judgment must receive the exact evidence selected by relevance judgments:

```text
relevance answers
    ↓
selected changed and supporting evidence
    ↓
final judgment state
```

That is a result-shaped future computation. Under the direct representation it requires Monad.

Every possible evidence subset is finite under the current bounds, so it could be enumerated and
evaluated speculatively. That does not remove the semantic dependency; it replaces one truthful
result-shaped stage with many hypothetical final judgments and discards all but one. No pricing
argument is needed to reject that representation.

## Conclusion

A single Applicative `Plan` cannot faithfully represent the complete pipeline.

The simplest declarative model is:

```text
Selective routing plan
    ↓
Applicative relevance plan
    ↓
explicit selected-evidence stage
    ↓
final judgment plan
    ↓
pure finding policy
```

Applicative composition remains valuable inside stages. Selective composition captures the known
routing tree. The selected-evidence transition stays explicit rather than being hidden inside a
general `Bind` callback.

## The core idea

```text
Natural-language meanings define the program.
Typed primitives define its syntax.
Applicative composition exposes independent judgments.
Selective composition exposes known conditional structure.
One explicit stage carries selected evidence into the final judgment.
Pure code interprets probabilities into policy.
```

The open design work is now narrow: define the smallest interface for those fixed stages. There is
no remaining need for a batching prototype.