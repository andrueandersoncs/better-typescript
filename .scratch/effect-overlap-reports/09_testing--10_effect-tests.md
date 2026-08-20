# Effect test registration overlap report

## Selected example

[`09_testing/10_effect-tests.ts`](../../repos/effect/ai-docs/src/09_testing/10_effect-tests.ts)

> **@title Writing Effect tests with @effect/vitest**
>
> Using `it.effect` for Effect-based tests.

## Documented predicate

- **Situation:** an Effect-based test is registered with `@effect/vitest`.
- **Noncompliant pattern:** the registration omits or replaces `it.effect` with an ordinary test
  registration.
- **Advice:** use `it.effect`.
- **Predicate:** the situation and noncompliant pattern together.

In this instructional context, “Using `it.effect`” is the prescribed test style. It establishes an
implicit alternative even though it is a title-like fragment rather than an explicit “avoid.” The
JSDoc does not require a particular import spelling, callback syntax, registration modifier, test
file name, or declaration shape.

## Catalog coverage

The frozen catalog contains 129 built-ins. Their implementations, messages, tests, and fixtures do
not collectively detect every documented registration and give equivalent advice.

[`effect-test-style`](../../packages/rules/src/rules/effect-test-style/index.ts) owns the same
semantic decision and advises:

> Use it.effect for Effect tests.

Its current scanner recognizes a direct `it` import from `@effect/vitest` when an inline arrow or
function-expression callback statically returns an Effect. It handles bare `it`, the listed plain
methods `only`, `skip`, `todo`, `concurrent`, and `sequential`, and direct `it.each(...)`.
Its [fixture](../../packages/rules/src/rules/effect-test-style/fixtures/effect-quality/tests/effect.spec.ts)
and [expected output](../../packages/rules/src/rules/effect-test-style/test/expected.json) cover the
ordinary bare registration.

Coverage is partial. The implementation misses:

- aliased imports and namespace access;
- callback identifiers instead of inline function expressions;
- enhanced `it` parameters supplied by `layer` or `describeWrapped`;
- ordinary registrations through `fails`, `for`, `skipIf`, `runIf`, `skip.each`, and `prop`; and
- combinations of those forms.

These are syntax and scanner residues. The JSDoc does not assign them a separate situation. The
test-time rules `test-clock-for-time` and `test-sleeps` own independent time and synchronization
concerns and do not provide the candidate advice. No other built-in completes this predicate.

## Minimal overlap witness

```ts
import { it } from "@effect/vitest"
import { Effect } from "effect"

it("works", () => Effect.void)
```

This is an Effect-based test registered without `it.effect`, so it satisfies the documented
predicate. It also satisfies `effect-test-style` at the same test registration, with the same
advice. A second rule would duplicate the current finding.

## Partial-coverage witnesses

```ts
import { it, it as effectIt } from "@effect/vitest"
import { Effect } from "effect"

const body = () => Effect.void

effectIt("alias", () => Effect.void)
it("callback identifier", body)
```

The current scanner requires the identifier text `it`, then requires an inline callback, so neither
registration is reported. Namespace access and enhanced callback parameters fail equivalent scanner
conditions. Ordinary forms such as `it.fails(...)`, `it.for(cases)(...)`,
`it.skipIf(condition)(...)`, `it.runIf(condition)(...)`, `it.skip.each(cases)(...)`, and
`it.prop(...)` are also outside its recognized method set.

Authoritative [`@effect/vitest` source](../../repos/effect/packages/vitest/src/index.ts) defines these
registration families. `it.live` and standalone `live` are intentional live-runtime alternatives.
`it.effect.each` and `it.effect.prop` remain compliant Effect-aware forms. The package also exports a
standalone `effect` tester. Whether the shorthand JSDoc intends that equivalent export to count as
`it.effect` is ambiguous, but either interpretation leaves the minimal overlap witness unchanged.

## Attempted source-grounded distinctions

| Attempted distinction | Result |
| --- | --- |
| Restrict a new rule to aliased imports | Rejected. Import spelling is absent from the JSDoc and the direct-import witness remains under existing ownership. |
| Restrict it to namespace access | Rejected. Namespace syntax is a symbol-resolution detail, not a distinct test situation. |
| Restrict it to callback identifiers | Rejected. Inline versus referenced callbacks does not change the Effect-based test decision. |
| Restrict it to enhanced `it` parameters | Rejected. The parameter provenance changes access to the same `@effect/vitest` registration API, not the advice. |
| Restrict it to `fails`, `for`, `skipIf`, `runIf`, `skip.each`, or `prop` | Rejected. Registration modifiers and parameterization do not create source-supported ownership boundaries. |
| Give the direct forms to `effect-test-style` and only its missed complement to a new rule | Rejected. Negating current scanner limits invents a boundary and would make ownership depend on syntax residue. |
| Treat `it.effect.each` or `it.effect.prop` as noncompliant | Rejected. They retain the prescribed `it.effect` tester and are demonstrated by the selected and authoritative sources. |
| Include `it.live` or standalone `live` | Rejected. They intentionally select the live runtime and are supported as separate Effect-aware testers. |
| Decide the standalone `effect` export either way | Neither choice makes a unique second predicate. It is authoritative API ambiguity outside the minimal shared bare-`it` witness. |
| Report any exported Effect value in a test file | Rejected. A standalone Effect can be a helper rather than a registered test; test intent is not established by export syntax. |
| Restrict by `.test`/`.spec` path, export status, test name, or callback body shape | Rejected. None appears in the leading JSDoc. |
| Target the callback instead of the registration call | Rejected. A different AST target does not separate ownership of the same test registration decision. |

Broadening `effect-test-style` would preserve one catalog owner. Restricting a second rule to the
missed forms would not.

## Earlier-example ledger

| Example | Classification | Evidence |
| --- | --- | --- |
| `01_effect/01_basics/01_effect-gen.ts` | Existing overlap outcome | Its async/await workflow intersects `no-async-functions`; see [`01_effect--01_basics--01_effect-gen.md`](01_effect--01_basics--01_effect-gen.md). |
| `01_effect/01_basics/02_effect-fn.ts` | Covered | `prefer-effect-fn` detects functions returning `Effect.gen` across the documented function forms and advises `Effect.fn`. |
| `01_effect/01_basics/10_creating-effects.ts` | Ineligible | It is a capability overview of independent source kinds, without one noncompliant pattern and advice. |
| `01_effect/02_schema/10_schema-basics.ts` | Ineligible | Defining, decoding, and encoding are independent topics without one common predicate. |
| `01_effect/03_services/01_service.ts` | Covered | `prefer-context-service-class` implements the class-style `Context.Service` preference. |
| `01_effect/03_services/10_reference.ts` | Ineligible | It describes the default-value capability without normative advice or an observable alternative. |
| `01_effect/03_services/20_layer-composition.ts` | Covered | `dependent-layer-merge` detects dependent `merge` and `mergeAll` composition and advises `Layer.provide` or `Layer.provideMerge`. |
| `01_effect/03_services/20_layer-unwrap.ts` | Covered | `prefer-layer-unwrap` detects the manual `Layer.effect` and `Layer.flatMap` bridge and advises `Layer.unwrap`. |
| `01_effect/04_errors/01_error-handling.ts` | Ineligible | It is a descriptive, multi-topic error-definition and recovery overview without one common predicate. |
| `01_effect/04_errors/10_catch-tags.ts` | Existing overlap outcome | Its multi-tag recovery predicate conflicts with supported `catch` and array-valued `catchTag`; see [`01_effect--04_errors--10_catch-tags.md`](01_effect--04_errors--10_catch-tags.md). |
| `01_effect/04_errors/20_reason-errors.ts` | Existing overlap outcome | Its reason-recovery predicate conflicts with supported parent `catchTag` and `catch`; see [`01_effect--04_errors--20_reason-errors.md`](01_effect--04_errors--20_reason-errors.md). |
| `01_effect/05_resources/10_acquire-release.ts` | Ineligible | Cleanup need is not completely observable; an omitted `acquireRelease` may mean the value needs no cleanup. |
| `01_effect/05_resources/20_layer-side-effects.ts` | Ineligible | The Effect type does not reveal background-work intent, and API-specific markers would define only an invented subset. |
| `01_effect/05_resources/30_layer-map.ts` | Existing overlap outcome | Its keyed resource predicate conflicts with `scoped-client-cache`; see [`01_effect--05_resources--30_layer-map.md`](01_effect--05_resources--30_layer-map.md). |
| `01_effect/06_running/10_run-main.ts` | Ineligible | The process-entrypoint role is open-world and cannot be established from an Effect execution call alone. |
| `01_effect/06_running/20_layer-launch.ts` | Ineligible | Long-running entrypoint intent and the provenance of an omitted Layer are not observable from a general Effect program. |
| `01_effect/07_pubsub/10_pubsub.ts` | Ineligible | In-process event-bus intent is not observable from a generic service or queue-like implementation. |
| `03_stream/10_creating-streams.ts` | Ineligible | It is a multi-topic capability catalog for unrelated source kinds, with no one predicate. |
| `03_stream/20_consuming-streams.ts` | Ineligible | It is a multi-topic capability catalog for transformation and consumption operators, with no one predicate. |
| `03_stream/30_encoding.ts` | Ineligible | An omitted structured-codec role is not observable; general channel pipelines need not encode structured data. |
| `04_integration/10_managed-runtime.ts` | Ineligible | The external-framework boundary is not observable from an ordinary Effect execution site. |
| `05_batching/10_request-resolver.ts` | Ineligible | Batched-lookup intent is not observable from request classes or ordinary repeated lookups. |
| `06_schedule/10_schedules.ts` | Ineligible | Its JSDoc is a multi-topic build, compose, and use list; `Effect.retry` and `Effect.repeat` also support first-party options objects instead of Schedule values. |
| `07_datetime/10_creating-and-formatting.ts` | Ineligible | Parsing, Clock-powered current time, and formatting are independent instructions without one common predicate. |
| `07_datetime/20_time-zones.ts` | Ineligible | Attaching zones, rendering zoned strings, and providing a current-zone service are independent instructions without one common predicate. |
| `08_observability/10_logging.ts` | Ineligible | Logger choice and log-level filtering are separate production capabilities, and the block prescribes no one observable alternative. |
| `08_observability/20_otlp-tracing.ts` | Ineligible | Tracing, log export, and reusable Layer composition are multiple topics; omission of a reusable observability boundary is open-world. |

## Conclusion

The example is uncovered because `effect-test-style` misses documented cases. It is not uniquely
scoped because the existing rule owns the same minimal registration and gives identical advice. No
source-supported conjunct assigns the scanner residues to a second rule.

This run therefore adds no TypeScript rule or test changes.
