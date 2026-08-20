# Effect.catchTags overlap report

## Selected example

[`01_effect/04_errors/10_catch-tags.ts`](../../repos/effect/ai-docs/src/01_effect/04_errors/10_catch-tags.ts)

> **@title Catch multiple errors with Effect.catchTags**
>
> Use `Effect.catchTags` to handle several tagged errors in one place.

## Documented predicate

- **Situation:** one Effect recovery decision handles at least two distinct tagged error variants.
- **Noncompliant pattern:** that recovery omits `Effect.catchTags` and uses another recovery form.
- **Advice:** use `Effect.catchTags` to handle the tagged errors in one place.
- **Predicate:** the situation and noncompliant pattern together.

“Use” is normative, and “several” means at least two. The JSDoc does not say that handlers must
differ, inspect `_tag`, or return different results.

## Catalog coverage

The frozen catalog contains 128 built-ins. Their implementations, messages, tests, and fixtures do
not detect this full predicate with equivalent advice.

- `typed-error-recovery` owns `Effect.catchCause` and `Effect.catchAllCause`, not direct tagged-error
  recovery.
- `no-try-catch` owns JavaScript `try` statements and lists `catch`, `catchTag`, and `catchTags` as
  valid Effect alternatives.
- Schema error rules own error declarations, not the recovery call.
- Syntax rules can co-report independent representation concerns, but none requires `catchTags`.

The catalog therefore does not already cover the candidate and does not create the blocking overlap.

## Competing predicates

### Candidate predicate

Use `Effect.catchTags` whenever one recovery place handles several tagged errors.

### Authoritative `Effect.catch` predicate

[`Effect.catch`](../../repos/effect/packages/effect/src/Effect.ts) says:

> Use when every recoverable error from an effect should be handled by the same fallback function
> while unrecoverable defects remain defects.

This advice applies even when the error channel contains several tagged variants.

### Supported `Effect.catchTag` array form

The same Effect source gives `catchTag` a non-empty-array tag overload. Vendored tests and
`01_effect/04_errors/01_error-handling.ts` intentionally use it to recover multiple tags with one
handler. The candidate JSDoc does not state when this form should yield ownership to `catchTags`.

## Minimal overlap witness

```ts
import { Effect, pipe } from "effect"

type ValidationError = { readonly _tag: "ValidationError" }
type NetworkError = { readonly _tag: "NetworkError" }

declare const source: Effect.Effect<string, ValidationError | NetworkError>
const recover = () => Effect.succeed("fallback")

export const result = pipe(source, Effect.catch(recover))
```

The `Effect.catch` call handles several tagged errors in one place without `catchTags`, so it
satisfies the candidate predicate. It also handles every recoverable error with one fallback, so it
satisfies the authoritative `Effect.catch` predicate. Both predicates own the same recovery call and
give competing API advice.

A second ambiguity is explicitly supported:

```ts
export const result = source.pipe(
  Effect.catchTag(["ValidationError", "NetworkError"], recover)
)
```

## Attempted source-grounded distinctions

| Attempted distinction | Result |
| --- | --- |
| Limit the rule to repeated `Effect.catchTag` stages | Rejected. The JSDoc says several tagged errors, not repeated stages. Broad `catch` and array-valued `catchTag` also satisfy that wording. |
| Require different handlers or outcomes | Rejected. The JSDoc does not contain this condition. |
| Require the handler to inspect `_tag` | Rejected. This adds implementation intent absent from the JSDoc. |
| Exclude a shared fallback handled by `Effect.catch` | Rejected. “Several tagged errors” includes an identical fallback, and no source phrase assigns it elsewhere. |
| Exclude array-valued `Effect.catchTag` | Rejected. It is a supported multi-tag form and appears in an earlier canonical example. |
| Restrict to adjacent stages in one `.pipe` call | Rejected. Adjacency and method-pipe syntax are not documented boundaries. |
| Restrict to `Schema.TaggedError` classes | Rejected. “Tagged errors” is structural and does not name one constructor. |
| Require exhaustive recovery | Rejected. The JSDoc does not require all error variants to be handled. |
| Restrict by export, service, test, file, or declaration shape | Rejected. None appears in the JSDoc. |
| Give broad `catch` to its own documentation | This identifies the genuine conflict but does not make the candidate disjoint; the same call still satisfies both predicates. |
| Use different AST targets | Rejected. Shared or different syntax does not resolve ownership of the same recovery decision. |

A source sentence such as “When tagged errors need different handlers, prefer one `catchTags` table
over repeated `catchTag` stages” would create a disjoint predicate. The current JSDoc does not.

## Earlier-example ledger

| Example | Classification | Evidence |
| --- | --- | --- |
| `01_effect/01_basics/01_effect-gen.ts` | Existing overlap outcome | Its async/await situation conflicts with `no-async-functions`; see [`01_effect--01_basics--01_effect-gen.md`](01_effect--01_basics--01_effect-gen.md). |
| `01_effect/01_basics/02_effect-fn.ts` | Covered | `prefer-effect-fn` detects functions returning `Effect.gen` and advises `Effect.fn`. |
| `01_effect/01_basics/10_creating-effects.ts` | Ineligible | Capability overview across independent source kinds; no one noncompliant pattern or advice. |
| `01_effect/02_schema/10_schema-basics.ts` | Ineligible | Independent model, decode, and encode concerns have no common predicate. |
| `01_effect/03_services/01_service.ts` | Covered | `prefer-context-service-class` implements the class-style `Context.Service` preference. |
| `01_effect/03_services/10_reference.ts` | Ineligible | Capability description with no normative advice or noncompliant pattern. |
| `01_effect/03_services/20_layer-composition.ts` | Covered | `dependent-layer-merge` detects dependent `merge`/`mergeAll` and advises `provide` or `provideMerge`. |
| `01_effect/03_services/20_layer-unwrap.ts` | Ineligible | `Effect<Layer>` is observable, but intent to use the inner Layer and eventual omission of `Layer.unwrap` require open-world dataflow or invented ownership boundaries. |
| `01_effect/04_errors/01_error-handling.ts` | Ineligible | Descriptive, multi-topic error-definition and recovery overview without one predicate. |

## Conclusion

The candidate is uncovered but not uniquely scoped. A broad `Effect.catch` over multiple tagged
errors is a minimal same-target witness with competing authoritative advice, and no candidate-source
conjunct assigns disjoint ownership. This run therefore adds no TypeScript rule or test changes.
