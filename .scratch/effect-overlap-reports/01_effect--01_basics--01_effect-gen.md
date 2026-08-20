# Effect.gen rule overlap report

## Selected example

[`01_effect/01_basics/01_effect-gen.ts`](../../repos/effect/ai-docs/src/01_effect/01_basics/01_effect-gen.ts)

> **@title Using Effect.gen**
>
> Use `Effect.gen` to write code in an imperative style similar to async await. You can use `yield*`
> to access the result of an effect.

## Documented predicate

- **Situation:** Effect code is written as an imperative, async/await-style workflow.
- **Noncompliant pattern:** an observable async/await alternative omits `Effect.gen`.
- **Advice:** use `Effect.gen`; use `yield*` to access Effect results.
- **Predicate:** the situation and noncompliant pattern together.

The normative “Use `Effect.gen`” establishes the noncompliant alternative even without an explicit
“avoid.” The second sentence explains the result-access mechanism. It does not require every Effect
inside a generator to be yielded.

## Catalog coverage and competing predicates

The frozen catalog contains 127 built-ins. Its implementations, messages, tests, and fixtures were
compared for this concern.

### `no-async-functions`

[`no-async-functions`](../../packages/rules/src/rules/no-async-functions/index.ts) reports the
`async` modifier on function declarations, function expressions, arrow functions, and methods. It
advises:

> Avoid declaring functions as async. Model asynchronous work with Effect instead of async/await.

Its predicate covers function-contained async/await workflows, but not module-level `await`. Its
advice also does not specifically prescribe `Effect.gen` and `yield*`. Coverage is therefore
partial, not exact.

### `prefer-effect-fn`

[`prefer-effect-fn`](../../packages/rules/src/rules/prefer-effect-fn/index.ts) reports functions
that already return `Effect.gen` and advises using `Effect.fn`. It exactly owns the next documented
example’s explicit negative pattern. It does not match an async/await workflow before conversion. It
is a remediation boundary, not coverage of this candidate.

### Nearby disjoint rules

- `no-for-of-loops` owns `for await...of` with Stream- or combinator-specific advice.
- `no-nested-calls` can report expression structure inside an awaited expression.
- `prefer-direct-yield` applies only inside an existing generator.
- `service-method-effect-fn`, `prefer-effectful-function`, `no-void-functions`, and
  `effect-test-style` address independent function or test contracts.

No other built-in detects the full documented predicate with equivalent advice.

## Minimal overlap witness

```ts
import { Effect } from "effect"

async function workflow() {
  const value = await Effect.runPromise(Effect.succeed(1))
  return value + 1
}
```

This is an imperative async/await workflow that accesses an Effect result without `Effect.gen`.
`no-async-functions` reports the same workflow decision and advises migration from async/await to
Effect. A candidate rule would add overlapping `Effect.gen`/`yield*` advice for that decision.
Different AST targets (`async` and `await`) do not make the concerns independent.

## Partial-coverage witness

```ts
import { Effect } from "effect"

const value = await Effect.runPromise(Effect.succeed(1))
```

This module-level workflow still satisfies the documented predicate, but `no-async-functions` has no
function modifier to report. Restricting a new rule to this residue would create an undocumented
“top-level only” policy.

## Attempted source-grounded distinctions

| Attempted distinction                                                   | Result                                                                                                                              |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Treat the block as capability-only                                      | Rejected. “Use `Effect.gen`” is normative and establishes an omitted/replaced alternative under the workflow contract.              |
| `AwaitExpression` rather than the `async` modifier                      | The syntax more directly represents awaiting, but every function-contained `await` still requires `async`; overlap remains.         |
| Module-level `await` versus function-contained `await`                  | Rejected. “Top-level” and “module” are absent from the JSDoc.                                                                       |
| Use the top-level sample shape as policy                                | Rejected. Code below the JSDoc may identify API shape but cannot add a top-level-only policy.                                       |
| Assign all function-contained workflows to the next `Effect.fn` example | Rejected. That example explicitly owns functions already returning `Effect.gen`; an async function currently returns `Promise`.     |
| Exclude function-contained `await` and rely on `no-async-functions`     | Rejected. It removes overlap only by leaving the specific `Effect.gen`/`yield*` advice uncovered.                                   |
| Include function-contained `await` but advise `Effect.fn`               | Rejected. It no longer implements this example’s `Effect.gen` advice and still duplicates `no-async-functions`.                     |
| Only `await Effect.runPromise(effect)`                                  | Rejected. `runPromise` is absent from the JSDoc, and function overlap remains.                                                      |
| Only await operands whose type is `Effect`                              | Rejected. JavaScript `await` does not execute a plain Effect value.                                                                 |
| Any awaited Promise                                                     | Rejected. A Promise cannot be used directly with `yield*`; conversion advice such as `Effect.tryPromise` is absent from this JSDoc. |
| Promise `.then` chains                                                  | Disjoint but outside the situation: they are not imperative async/await-style syntax.                                               |
| Combinator-only Effect workflows                                        | Rejected. Preferring generators over all combinators is policy absent from this leading JSDoc.                                      |
| Public, exported, named, service, or test functions                     | Rejected. None of these boundaries appears in the JSDoc.                                                                            |
| `for await...of`                                                        | It is separately owned by `no-for-of-loops`; including it would require Stream-specific advice absent here.                         |

## Earlier-example ledger

None. This is the first qualifying example in canonical UTF-8 byte order.

## Conclusion

The candidate is uncovered because the catalog misses module-level `await` and lacks equivalent
`Effect.gen`/`yield*` advice. It is not uniquely scoped because its full source-derived situation
intersects `no-async-functions` at the same async/await workflow decision. The only implementation-
disjoint residue requires a top-level boundary that the source does not state.

This run therefore adds no TypeScript rule or test changes.
