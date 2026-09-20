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

The fixed stages now exist in `internal/semanticlint`. Their completed design and verification record
is `.scratch/declarative-semantic-review/spec.md`.

## Implemented capabilities enabled by fixed-stage plans

`internal/semanticlint` now implements the seven capabilities below. They use concrete route,
relevance, selected-evidence, and final stages rather than a general `Plan[T]`. The explicit
`selectedEvidence` boundary remains unchanged. Focused proof lives in
`internal/semanticlint/plan_capabilities_test.go` and
`internal/semanticlint/testdata/fixtures/full-pipeline.json`.

### Dry-run plan inspection

**Purpose:** Show the semantic work declared for a rule without sending that work to TypeSafe.

The current pipeline has two inspection points:

1. `buildRoutePlan` can expose the complete domain → path → hunk tree before any routing answer.
2. `buildRelevancePlan` can expose all relevance judgments after route interpretation and
   deterministic evidence expansion.

A dry run cannot truthfully show the exact relevance or final plan before routing. Those stages
depend on selected route nodes and then on `selectedEvidence`. It must display unresolved boundaries
instead of inventing later-stage work.

A useful route-plan view would include:

- rule id, path, scope, and model selection;
- stage names;
- candidate ids and descriptions;
- domain, path, hunk, and recursive bucket relationships;
- automatic selections for zero- and one-candidate choices;
- request-size cases that would stop without evaluation.

A useful relevance-plan view would include:

- ordered evidence candidates and their stable identities;
- question ids, Noul instructions, and criteria;
- the physical partitions the current interpreter would create;
- declarations too large to evaluate;
- the fact that probabilities and final selection are not yet available.

The output must be deterministic for identical inputs, perform no evaluator calls, and clearly mark
declared, selected, and unresolved data. It must not imply that a full pipeline plan exists before
the real `selectedEvidence` transition.

**Minimum proof:** a no-network command or API produces identical output for identical evidence,
includes every declared route and relevance node, and stops at honest stage boundaries.

### Plan validation

**Purpose:** Reject malformed declarations before any evaluator call.

Validation should remain concrete to each stage:

- route validation checks stage names, candidate-id uniqueness within a Choice, bucket limits,
  bucket/leaf shape, and that every path and hunk belongs to its declared parent;
- relevance validation checks candidate-index bounds, one judgment per declared candidate, unique
  question ids, Noul question types, and stable question ordering;
- selected-evidence validation checks thresholded order, selection limits, request-size fit, and the
  derived `hasChanged` invariant;
- final-plan validation checks that its sole input is `selectedEvidence`, the question id matches the
  rule, exactly one Noul is declared, and a final evaluation is attempted only when changed evidence
  exists.

Validators must be pure. They report invariant failures; they do not repair plans, reorder
candidates, manufacture ids, drop evidence, or call an evaluator. Production interpretation may
invoke them defensively, while constructors and focused tests should establish that valid plans are
the normal case.

Validation errors need the concrete stage, rule id, candidate or question id, and violated
invariant. They must not expose more source evidence than the caller could already read.

**Minimum proof:** each invariant has a malformed fixture that fails before the evaluator is called,
while constructor-produced plans pass without mutation.

### Exact question provenance

**Purpose:** Explain how every model question and answer contributed to a selected finding.

Question provenance should form a lineage:

```text
rule
→ declared stage and plan node
→ repository evidence candidate
→ physical request and question
→ typed answer with raw probability
→ routing or relevance decision
→ selectedEvidence
→ final judgment
→ finding
```

A provenance key must be scoped beyond a local question id. At minimum it needs the rule id, stage,
plan-node or evidence id, and question id. For recorded runs it should also include:

- a hash of the deterministic question declaration and state;
- the selected model name or pinned model version;
- the physical request partition;
- raw returned probabilities;
- the policy threshold or beam decision that consumed the answer;
- whether the node was selected, skipped, dropped for size, or short-circuited.

Provenance records should reference evidence by stable id and content hash. Embedding full source
snippets by default would duplicate sensitive repository data and make records unnecessarily large.
Access and retention must be no broader than for the semantic-lint output itself.

Provenance is explanatory metadata. It must not change ranking, thresholds, canonical ordering, or
the evidence supplied to later stages.

**Minimum proof:** every reported finding can be traced back to its final Noul and selected evidence;
every selected evidence item can be traced to its relevance answer and route leaf; skipped branches
are distinguishable from evaluated-and-rejected branches.

### Fixture plan interpreters

**Purpose:** Exercise declared plans deterministically without HTTP or a model.

Fixture interpreters should consume the same concrete plans as production interpreters:

- a route fixture maps a scoped route Choice to a typed choice and probability distribution;
- a relevance fixture maps each declared question identity to one Noul probability;
- a final fixture supplies the single final Noul probability;
- a pure selected-evidence policy remains real code, not fixture behavior.

Fixtures must be declarative data, not callbacks that recreate hidden control flow. The interpreter
should reject:

- missing answers for evaluated questions;
- answers for undeclared questions;
- wrong answer types;
- choices outside the declared candidate set;
- invalid or non-finite probabilities;
- fixture entries left unused because their expected branch was never evaluated, when strict mode is
  requested.

The route fixture must preserve Selective execution: an answer selects among branches already in the
plan. The relevance fixture must preserve Applicative independence. The final fixture must not allow
construction before `selectedEvidence`.

**Minimum proof:** the same plan and fixture always produce the same decisions, selected evidence,
finding, and trace; malformed or stale fixtures fail with the exact stage and question identity.

### Deterministic execution traces

**Purpose:** Record what the interpreter did in a form that can be compared across runs.

A trace may contain events such as:

```text
plan_built
question_scheduled
question_answered
branch_selected
branch_skipped
evidence_ranked
evidence_selected
final_short_circuited
final_answered
finding_composed
```

Concurrency completion order is not stable. Trace order must therefore derive from declared plan
order, stage order, candidate order, and question order—not wall-clock completion. Timestamps and
latency may be optional annotations, but they cannot define equality between traces.

Each event should carry stable identities, raw probabilities where applicable, the deterministic
policy decision, model and usage metadata, and hashes of relevant declarations or evidence. The
trace must distinguish observed repository facts from model-produced answers.

A deterministic trace does **not** make remote model evaluation deterministic. Replaying a recorded
trace requires the same plan plus recorded typed answers. Re-running the model may produce a
different trace even when request declarations are identical.

Trace collection must be observational: disabling it cannot change evaluation order, selection,
errors, findings, or JSON output. Sensitive source snippets should be referenced by id and hash
unless an explicitly protected diagnostic mode requests their contents.

**Minimum proof:** concurrent runs over the same plan and recorded answers produce byte-identical
canonical traces, and enabling tracing does not change the semantic result.

### Plan cost estimation

**Purpose:** Estimate operational work without allowing cost to define semantic structure.

Useful structural estimates include:

- declared question count;
- minimum and maximum evaluator calls;
- serialized request bytes by stage;
- candidates omitted because no legal request fits;
- lower and upper bounds for Selective route execution;
- exact relevance partitions once routed evidence is known;
- expected token or monetary cost only when a versioned external pricing model is supplied.

Route cost is generally a range. The complete branch tree is known, but selected-only
interpretation does not know which child branches will run until parent answers arrive. Relevance
cost becomes exact only after routing and evidence expansion. Final-judgment cost is zero or one
request depending on `selectedEvidence.hasChanged`.

Estimation must reuse the same serialization and request-size rules as the interpreter or report
that it is approximate. Token and monetary estimates require explicit model-version and pricing
metadata; aliases such as `jev-latest` cannot provide durable prices.

Cost remains an interpreter concern and a non-goal of the semantic design. An estimator must not:

- drop declared judgments to meet a budget;
- alter thresholds, beam width, or evidence limits;
- choose route branches;
- collapse the selected-evidence boundary;
- represent a cost estimate as a correctness guarantee.

**Minimum proof:** estimates bound the actual request count and bytes for recorded runs, exact
post-routing estimates match the interpreter, and missing pricing metadata yields an unknown value
rather than a fabricated number.

### Speculative route evaluation

**Purpose:** Evaluate known child route branches before their parents select them, when an explicit
interpreter strategy chooses latency over evaluator work.

The route tree is already complete, so a speculative interpreter could schedule questions from
multiple known branches concurrently. After parent answers arrive, it would retain results only from
selected branches and continue with the same beam scoring and canonical ordering as the current
selected-only interpreter.

Speculation must remain route-local. It must not enumerate possible evidence subsets or evaluate
hypothetical final judgments. The real relevance result → `selectedEvidence` → final-plan dependency
remains sequential.

Correct speculative execution requires explicit rules:

- selected and unselected branches use identical declared questions;
- discarded branch answers cannot affect decisions, selected evidence, findings, or output;
- errors from a discarded branch do not fail the selected execution;
- an error from a selected branch has the same behavior as today;
- cancellation stops work that can no longer be selected;
- usage accounts for every physical request actually made, including discarded work;
- concurrency limits and evaluator safety are enforced;
- selected results remain canonically ordered, independent of completion order.

Because remote calls consume resources and may be rate-limited, speculative execution must be
opt-in. It is an alternate interpreter strategy, not a new semantic plan and not the default merely
because the plan is inspectable.

**Minimum proof:** for the same recorded answers, selected-only and speculative interpreters produce
identical selected hunks, routing decisions, selected evidence, final finding, and errors on selected
branches; only latency, request count, and usage may differ.