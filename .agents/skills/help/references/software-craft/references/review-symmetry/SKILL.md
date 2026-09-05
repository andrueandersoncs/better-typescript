---
name: review-symmetry
description: Review code specifically for opportunities for symmetry in APIs, construction, naming, data shapes, and control flow. Use when related concepts feel inconsistent or a first-class abstraction appears to have a missing counterpart.
---

# Review Symmetry

Symmetry is beautiful and makes code easier to read and understand. When related concepts have corresponding forms, learning one helps the reader predict the other. Look for places where the code could express those relationships more clearly.

Review only. Do not change code unless asked. Stay focused on symmetry rather than general correctness, security, performance, or style review.

## Method

1. Read the supplied code and identify conceptual peers, pairs, and families. Compare their roles before comparing their syntax.
2. Inspect their definitions and representative callers when available. Establish the local convention and whether a difference reflects a meaningful difference in responsibility. With only a snippet, distinguish what is visible from what needs inspection.
3. Look for missing counterparts and inconsistent treatment:
   - **Construction and abstraction:** a named constructor beside an inline object; one domain concept has a module, type, or builder while its peer is anonymous.
   - **API shape:** corresponding operations differ in naming, argument order, return shape, or composition style.
   - **Representation:** related data, states, or branches express the same relationship in different forms or at different levels of detail.
   - **Pairs and lifecycle:** inverse or complementary operations have mismatched structure, ownership, or discoverability.
4. For each candidate, explain the relationship the code should reveal and what a reader could predict after the change. Readability and conceptual coherence are sufficient benefits; a runtime defect is not required.
5. Choose the smallest coherent change. Symmetry can come from giving a peer a matching abstraction, simplifying an overbuilt peer, or aligning existing names and shapes. Preserve differences that communicate different semantics. Do not invent operations or force unrelated concepts into one abstraction just to make them look alike.
6. Report the strongest opportunities first. Treat a missing API as a proposal, not an existing export. If its value depends on unseen definitions or callers, say exactly what to inspect before recommending it.

## Example: construction symmetry

```ts
const CounterReducer = Reducer.make({
  initialState: 0,
  action: CounterActionSchema,
  operations: [FetchCount],
  reduce: counterReduce,
})

const fetchCount = (request: (typeof FetchCount)["Type"]) =>
  pipe(Console.log(`fetching ${request.key}`), Effect.as(41))

const CounterStore = Store.define({
  reducer: CounterReducer,
  algebra: {
    FetchCount: fetchCount,
  },
})
```

`reducer` and `algebra` are collaborators in `Store.define`, but only the reducer is constructed as a named domain value. Evaluate whether the algebra deserves the same treatment:

```ts
// Proposed API shape; Algebra.make is not established by the snippet.
const CounterAlgebra = Algebra.make({
  FetchCount: fetchCount,
})

const CounterStore = Store.define({
  reducer: CounterReducer,
  algebra: CounterAlgebra,
})
```

This would make the two collaborators equally visible and their construction predictable. Inspect `Reducer.make`, the algebra type, and `Store.define` callers to decide whether `Algebra.make` would express a useful domain boundary or support type inference. If a constructor adds nothing beyond the name, extracting `CounterAlgebra` as a plain object may supply the useful symmetry more simply. Do not assume either choice is correct from the snippet alone.

## Output

For each opportunity, give:

- **Location and counterparts:** exact symbols and file/line references when available.
- **Asymmetry:** the differing forms and why their concepts belong together.
- **Proposal:** the smallest useful change, with a short code sketch when clearer.
- **Benefit and tradeoff:** what becomes easier to read or predict, what complexity is added, and any evidence still needed.

Do not invent findings to fill a quota. If no worthwhile opportunity exists, say so briefly; mention a deliberate asymmetry only when it explains why an apparent candidate should remain.
