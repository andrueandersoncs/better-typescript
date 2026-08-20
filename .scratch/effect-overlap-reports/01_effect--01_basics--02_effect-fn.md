# Effect.fn rule overlap report

## Selected example

[`01_effect/01_basics/02_effect-fn.ts`](../../repos/effect/ai-docs/src/01_effect/01_basics/02_effect-fn.ts)

> **@title Using Effect.fn**
>
> When writing functions that return an Effect, use `Effect.fn` to use the
> generator syntax.
>
> **Avoid creating functions that return an Effect.gen**, use `Effect.fn`
> instead.

## Documented predicate

- **Situation:** a function returns an Effect and uses generator syntax.
- **Noncompliant pattern:** the function creates and returns `Effect.gen`.
- **Advice:** use `Effect.fn` instead.
- **Predicate:** the situation and noncompliant pattern together.

The JSDoc does not require exports, parameters, a specific declaration form, a name string, or a
single-statement body. Code and comments below the JSDoc cannot add those policy boundaries.

## Catalog coverage and competing predicates

The frozen catalog contains 126 built-ins. Its implementations, messages, tests, and fixtures were
compared for this concern.

### `prefer-effect-fn`

[`prefer-effect-fn`](../../packages/rules/src/rules/prefer-effect-fn/index.ts) gives the same core
advice:

> Avoid wrapping the body of &lt;name&gt; in Effect.gen; use Effect.fn.

Its [scanner](../../packages/rules/src/rules/prefer-effect-fn/preferEffectFn.ts) currently requires:

1. a variable declaration initialized directly with an arrow function or function expression;
2. at least one outer function parameter;
3. a checker-visible Effect return type;
4. a concise body or one-statement block returning the call directly; and
5. an Effect-package property access named `gen`.

Its predicate is therefore a strict subset of the documented predicate. Its
[fixture](../../tests/fixtures/prefer-effect-fn/src/cases.ts) and
[focused test](../../tests/preferEffectFn.test.ts) cover only parameterized variable functions.

### `service-method-effect-fn`

[`service-method-effect-fn`](../../packages/rules/src/rules/service-method-effect-fn/index.ts)
reports public exported Effect operations and Context service methods that are not named
`Effect.fn` operations. It advises:

> Wrap public Effect service operations with a named Effect.fn.

It suppresses parameterized direct `Effect.gen` variable functions so `prefer-effect-fn` owns that
current intersection. It reports exported zero-parameter wrappers, but not equivalent local
wrappers. Its public/service predicate is source-supported for that rule, but the candidate JSDoc
contains no public or service boundary.

### Nearby disjoint rules

- `effect-fn-name` applies after conversion to `Effect.fn`; naming is absent from this JSDoc.
- `no-trivial-effect-fn` applies to existing `Effect.fn` forwarders.
- `no-function-keyword` advises arrow syntax, not `Effect.fn`.
- `effect-test-style`, `prefer-effectful-function`, and `prefer-direct-yield` address independent
  concerns and do not provide equivalent coverage.

No other built-in detects the documented concern with equivalent advice.

## Minimal overlap witness

```ts
import { Effect } from "effect"

const load = (id: string) =>
  Effect.gen(function* () {
    return id
  })
```

This single function satisfies both the documented predicate and the current `prefer-effect-fn`
predicate. Both rules would target `load` at the same wrapper decision and advise replacing
`Effect.gen` with `Effect.fn`. A separate candidate rule would duplicate the existing finding.

## Partial-coverage witness

```ts
import { Effect } from "effect"

const ready = () =>
  Effect.gen(function* () {
    return 1
  })
```

This is still a function that returns `Effect.gen`. The complete catalog reports no violation for
this local zero-parameter case. Mechanical checks also produced this exact nearby matrix:

| Witness | Exact nearby rule-name set |
|---|---|
| local zero-parameter wrapper | none |
| local parameterized wrapper | `prefer-effect-fn` |
| exported zero-parameter wrapper | `service-method-effect-fn` |
| exported parameterized wrapper | `prefer-effect-fn` |

Coverage is therefore partial, not exact.

## Attempted source-grounded distinctions

| Attempted distinction | Result |
|---|---|
| Any Effect-returning function vs one returning `Effect.gen` | Rejected. The explicit noncompliant pattern is returning `Effect.gen`; broadening it invents policy. |
| Parameterized vs zero-parameter | Rejected. The JSDoc says “functions” without an arity condition. |
| Variable function vs declaration, method, or property | Rejected. The JSDoc states no declaration-form boundary. |
| Concise or single-statement vs multi-statement or branched body | Rejected. This is only a scanner limit. |
| Exported/public/service vs local/private | Rejected for the candidate. The JSDoc states no visibility or service boundary. |
| Direct `.gen` access vs alias, element access, assertion, or temporary | Rejected. These are detector mechanics, not policy distinctions. Symbol identity may only exclude unrelated lookalikes. |
| Named or domain-qualified `Effect.fn` vs unnamed `Effect.fn` | Rejected. Naming guidance is absent from the leading JSDoc. |
| Tracing benefit vs generator syntax | Rejected. Tracing appears only below the JSDoc and in the existing hint. |
| `self`/`this` binding vs ordinary generators | Rejected. The JSDoc states no such boundary. |
| Trivial forwarder vs larger workflow | Rejected. The JSDoc states no triviality exception. |
| Current `prefer-effect-fn` matches vs its complement | Rejected. Negating implementation limits does not create a source-grounded predicate. |

## Earlier-example ledger

### `01_effect/01_basics/01_effect-gen.ts` — ineligible

[`01_effect-gen.ts`](../../repos/effect/ai-docs/src/01_effect/01_basics/01_effect-gen.ts) states:

> **@title Using Effect.gen**
>
> Use `Effect.gen` to write code in an imperative style similar to async await.
> You can use `yield*` to access the result of an effect.

- **Situation:** writing Effect code in an imperative style and accessing an Effect result.
- **Advice:** use `Effect.gen` and `yield*`.
- **Noncompliant pattern:** none stated.

Inferring that another composition style is noncompliant would add policy absent from the JSDoc, so
this example has no complete triad.

## Conclusion

The candidate is uncovered because existing coverage misses documented cases. It is not uniquely
scoped because its minimal predicate intersects `prefer-effect-fn` at the same semantic target with
duplicate advice. No source-supported conjunct makes a second rule disjoint.

The correct catalog ownership would broaden the existing `prefer-effect-fn` rule. This workflow
requires a new uniquely scoped rule, so this run adds no TypeScript or test changes and stops with
this overlap report.
