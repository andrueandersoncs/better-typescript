# Effect reason-error overlap report

## Selected example

[`01_effect/04_errors/20_reason-errors.ts`](../../repos/effect/ai-docs/src/01_effect/04_errors/20_reason-errors.ts)

> **@title Creating and handling errors with reasons**
>
> Define a tagged error with a tagged `reason` field, then recover with
> `Effect.catchReason`, `Effect.catchReasons`, or by unwrapping the reason into
> the error channel with `Effect.unwrapReason`.

## Documented predicate

- **Situation:** a tagged parent error has a tagged `reason`, and code recovers from that error or
  its reason.
- **Noncompliant pattern:** the recovery omits all three listed reason APIs and instead handles the
  parent error by another recovery form.
- **Advice:** define the tagged reason structure, then recover with `catchReason`, `catchReasons`, or
  `unwrapReason`.
- **Predicate:** the definition and recovery form together.

The imperative wording is normative. “Define … then recover” is one sequenced instruction, not two
independent topics from which a declaration-only rule may be selected. The title also joins creating
and handling. A complete detector would therefore need to connect a recovery decision to the
checker-resolved error channel.

“Tagged” is structural here. Effect defines `ReasonTags<E>` as:

```ts
E extends { readonly reason: { readonly _tag: string } }
  ? E["reason"]["_tag"]
  : never
```

A source-complete predicate must include resolved aliases and unions, object/interface forms, and
`Data.TaggedError` and Schema forms. It cannot require `Schema.TaggedError` or a literal schema at the
`reason` property.

## Catalog coverage

The frozen catalog contains 129 built-ins. Its implementations, messages, tests, and fixtures do not
detect this complete definition-plus-recovery predicate or give the three-way advice.

- `schema-error-class` owns the representation of hand-rolled or `Data.TaggedError` classes and
  advises `Schema.TaggedErrorClass`. It does not inspect reason recovery. Already-schema-based errors
  are compliant with that rule.
- `typed-error-recovery` owns broad cause recovery and advises typed recovery. It treats `catchTag`
  as a compliant alternative and does not distinguish a tagged parent with a tagged reason.
- `no-try-catch`, `prefer-schema-tagged-struct`, and the other schema and recovery rules address
  independent syntax or representation concerns.

No exact current catalog coverage was found. Shared schema or recovery locations alone would not
make those independent concerns an overlap.

## Competing predicates

### Candidate predicate

When recovering a tagged error with a tagged `reason`, use `catchReason`, `catchReasons`, or
`unwrapReason` instead of another recovery form.

### Authoritative `Effect.catchTag` predicate

[`Effect.catchTag`](../../repos/effect/packages/effect/src/Effect.ts) says to use it when recovering
from one specific tagged error in an Effect error channel. This includes a single tagged parent error
whose handler inspects its tagged reason.

### Authoritative `Effect.catch` predicate

The same Effect source says to use `Effect.catch` when every recoverable error should use one
fallback. This also includes an error channel whose parent errors structurally contain tagged
reasons.

The candidate JSDoc does not state when these supported parent-error recovery forms yield ownership
to the reason APIs.

## Minimal overlap witness

```ts
import { Data, Effect } from "effect"

class RateLimit extends Data.TaggedError("RateLimit")<{ readonly retryAfter: number }> {}
class AiError extends Data.TaggedError("AiError")<{
  readonly reason: RateLimit
}> {}

declare const program: Effect.Effect<string, AiError>

export const handled = program.pipe(
  Effect.catchTag("AiError", ({ reason }) => Effect.succeed(reason._tag))
)
```

The program defines the documented structural tagged-reason shape and recovers while inspecting its
reason, but omits every listed reason API. It therefore satisfies the candidate predicate. It also
satisfies `catchTag`'s documented predicate because `AiError` is the one specific tagged error being
recovered. Both predicates own the same recovery call and give competing API advice.

Replacing `catchTag` with `catch` gives a second witness when `AiError` is the whole recoverable error
channel and one fallback is intended.

## Attempted source-grounded distinctions

| Attempted distinction | Result |
| --- | --- |
| Add a rule only for declaring the tagged `reason` field | Rejected. It drops the JSDoc's indivisible “then recover” instruction and arbitrarily selects one topic. |
| Limit declarations to `Schema.TaggedError` with a literal `reason` schema | Rejected. The policy says structural tagged errors, and Effect's own examples use `Data.TaggedError`; aliases and unions satisfy `ReasonTags`. |
| Limit recovery to the exact classes shown below the JSDoc | Rejected. Example names and constructors can identify shape but cannot add policy. |
| Require a direct syntactic `reason` property on a class | Rejected. Checker-resolved aliases, interfaces, intersections, inherited properties, and union reason variants have the same documented structure. |
| Report any reason-bearing error declaration without finding recovery | Rejected. It loses the sequenced recovery situation and treats an open-world omission as observable in one file. |
| Require declaration and recovery in the same file or lexical scope | Rejected. The JSDoc contains no locality boundary. |
| Exclude parent `catchTag` when its handler reads `reason` | Rejected. Such a call still handles an error with reasons, while `catchTag` explicitly owns recovery of one tagged parent error. |
| Exclude `catch` when the reason-bearing parent is the whole error channel | Rejected. The source gives no exception, and `catch` explicitly owns one shared fallback for all recoverable errors. |
| Require different handlers for distinct reason tags | Rejected. The JSDoc offers one-reason, multiple-reason, and unwrap strategies without this condition. |
| Restrict to repeated `catchTag` stages or `_tag` switches inside a handler | Rejected. Those syntax forms and control-flow requirements are absent from the JSDoc. |
| Target only `Effect` values with a direct, non-union error type | Rejected. This contradicts the structural conditional type and omits checker-resolved unions. |
| Distinguish by AST target | Rejected. A declaration target or recovery-call target does not resolve ownership of the same definition-and-recovery decision. |

A fresh-context boundary review rejected the narrow Schema/literal predicate and required structural,
alias, union, and `Data.TaggedError` coverage. Applying that review to the full sequenced instruction
leaves the `catchTag` and `catch` witnesses unresolved.

## Earlier-example ledger

| Example | Classification | Evidence |
| --- | --- | --- |
| `01_effect/01_basics/01_effect-gen.ts` | Existing overlap outcome | Its full async/await situation intersects `no-async-functions`; see [`01_effect--01_basics--01_effect-gen.md`](01_effect--01_basics--01_effect-gen.md). |
| `01_effect/01_basics/02_effect-fn.ts` | Covered | `prefer-effect-fn` detects functions returning `Effect.gen` and advises `Effect.fn`. |
| `01_effect/01_basics/10_creating-effects.ts` | Ineligible | It is a capability overview of independent source kinds, with no one noncompliant pattern and advice. |
| `01_effect/02_schema/10_schema-basics.ts` | Ineligible | Defining, decoding, and encoding are independent concerns without one common predicate. |
| `01_effect/03_services/01_service.ts` | Covered | `prefer-context-service-class` implements the class-style `Context.Service` preference. |
| `01_effect/03_services/10_reference.ts` | Ineligible | It describes a capability and gives no normative advice or observable alternative. |
| `01_effect/03_services/20_layer-composition.ts` | Covered | `dependent-layer-merge` detects the documented dependent composition alternative and advises `provide` or `provideMerge`. |
| `01_effect/03_services/20_layer-unwrap.ts` | Covered | `prefer-layer-unwrap` detects the documented manual `Layer.effect` and `Layer.flatMap` bridge and advises `Layer.unwrap`. |
| `01_effect/04_errors/01_error-handling.ts` | Ineligible | It is a descriptive, multi-topic definition and recovery overview without one common predicate. |
| `01_effect/04_errors/10_catch-tags.ts` | Existing overlap outcome | Its broad multi-tag recovery predicate conflicts with supported `catch` and array-valued `catchTag`; see [`01_effect--04_errors--10_catch-tags.md`](01_effect--04_errors--10_catch-tags.md). |

## Conclusion

The example is uncovered but not uniquely scoped. Parent `catchTag` and `catch` recovery are minimal
same-target witnesses with competing authoritative advice, and no source-supported predicate assigns
disjoint ownership. This run therefore adds no TypeScript rule or test changes.
