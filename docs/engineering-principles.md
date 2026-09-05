# Engineering principles for Effect applications

These principles are grounded in Effect **4.0.0-rc.112**, at upstream commit [`f9235832c4638437876b96f25b0423d1727b8030`](https://github.com/Effect-TS/effect/tree/f9235832c4638437876b96f25b0423d1727b8030). They describe application decisions and bounded lintable invariants, not general static proofs.

A rule is useful only where it can establish its stated fact from resolved APIs and a bounded local relationship. Unknown provenance, domain intent, lifetime transfer, protocol semantics, and arbitrary helper behavior remain review work. The project uses software laws as context: Hyrum's Law cautions that observable identity, timing, errors, and lifetimes are compatibility surfaces; Gall's Law favors bounded detectors over speculative global analysis; Goodhart's Law warns against treating rule count as progress. Those laws are not evidence in place of the linked implementation.

## 1. Describe work separately from executing it

**Mechanism.** An `Effect` is a lazy description: `Effect.sync` evaluates its thunk when interpreted, `Effect.gen` suspends generator creation, and execution enters the runtime through an explicit runner such as `runFork`. See the [lazy constructors](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/internal/effect.ts#L950-L968), [generator suspension](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/internal/effect.ts#L1210-L1229), and [fiber execution](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/internal/effect.ts#L5571-L5596).

**Invariant.** In an immediate `Effect.gen` or `Effect.fn` generator body, compose, return, or `yield*` an operation whose result matters. Constructing `Effect.logInfo("saved")` as a bare statement does not log. Likewise, `const cacheEffect = Cache.make(...)` describes acquisition; rerunning it can acquire another cache rather than share one.

**Nearest legal counterexample and tradeoff.** `console.log` in a JavaScript adapter is eager and is not a discarded Effect. A nested callback is not automatically owned by the surrounding generator, and deliberately constructing an inert Effect for a test or API is legal. The tradeoff is precision over a general “unused value” ban.

**Rule ownership.** `discarded-effect-operation` owns the narrow bare-operation case; `effect-test-style` owns test callbacks that return an Effect to a runtime that will not execute it. `cache-per-request` is retired: function nesting or hoisting a recipe does not prove cache sharing or request scope.

**Non-lintable limit.** A local pass cannot prove that an arbitrary helper eventually interprets an Effect, or whether an intentionally deferred description should execute now.

## 2. Make lifetime and failure ownership explicit

**Mechanism.** `forkChild` attaches a child to its parent, while `forkDetach` does not; `forkIn` registers a fiber with a scope. `FiberSet`, `FiberMap`, and `FiberHandle` have their own membership and failure-observation behavior. [`forkChild`/`forkDetach`](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/internal/effect.ts#L5386-L5469) and [scope registration](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/internal/effect.ts#L5516-L5565) show why a surrounding `Layer` is not itself ownership.

**Invariant.** Name the owner of every long-lived fiber and resource: parent, scope, cache entry, borrower, request, or application. Separately decide who releases it and who observes its failures. A successful acquisition does not establish either obligation.

**Nearest legal counterexample and tradeoff.** `forkChild` followed by `Fiber.join` is structured work without a `Layer`; a deliberately detached fiber returned to a caller can also be valid. Conversely, `Layer.effectDiscard(Effect.forkDetach(...))` does not become owned merely because a Layer supplies a Scope. Broad “every fork needs a Layer” advice hides these distinctions.

**Rule ownership.** `scoped-background-work` owns directly discarded detached starts; `layer-forever-acquisition` owns acquisition that cannot complete; `observable-worker-failure` owns explicit observation of intentionally ignored failure; `scoped-client-cache` owns a bounded resource-acquisition hazard in an ordinary cache lookup.

**Non-lintable limit.** Manual finalizers, exported handles, caller ownership, and cross-function failure reporting require lifetime and control-flow facts beyond a local traversal.

## 3. Choose synchronization for the transition

**Mechanism.** `Ref.update` performs a pure atomic read/compute/write. `SynchronizedRef.updateEffect` holds its semaphore across the effectful callback, so directly reacquiring the same reference waits for an unreleased permit. [`Ref.update`](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Ref.ts#L573-L580) and [the serialized callback](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/SynchronizedRef.ts#L485-L500) establish the distinction. `TxRef` and `TxQueue` use a transaction journal for coordinated multi-cell changes.

**Invariant.** Use `Ref` for a pure atomic transition, `SynchronizedRef` for an effectful transition, and `TxRef` under `Effect.tx` when the invariant spans transactional cells. Never run a same-reference lock-acquiring update from the immediately executing callback of an effectful synchronized update.

**Nearest legal counterexample and tradeoff.** Many contending fibers can safely use `Ref.update`; contention alone is not a reason to choose `SynchronizedRef`. Reads, updates of a different reference, and merely constructing an inner Effect are not a proven cycle. Manual permit transfer is sometimes necessary, although lexically owned work should prefer managed permit combinators because they mask release under interruption.

**Rule ownership.** `no-reentrant-synchronized-ref-update` owns the direct same-reference self-deadlock. `no-mutation` guidance distinguishes pure, effectful, and multi-cell transitions rather than prescribing a Layer for every local cell. `tx-queue-batch-capacity` owns the separate atomic-batch constraint.

**Non-lintable limit.** General lock ordering, alias equivalence, callback execution, and arbitrary transaction purity need interprocedural or control-flow analysis and are not inferred.

## 4. Treat representation and validation direction as contracts

**Mechanism.** A Schema decoder moves encoded or unknown representation toward decoded domain data; constructor input, `Schema.is`, and `make` have different contracts. [`decodeUnknownEffect` and decoded-side checking](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/SchemaParser.ts#L148-L250) are not substitutes for one another. `Schema.Opaque` returns its carrier unchanged, whereas `Schema.Class.make` constructs through `new this`; see [Opaque](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Schema.ts#L6248-L6302) and [Class construction](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Schema.ts#L13077-L13119).

**Invariant.** State which direction a boundary crosses: unknown wire value, encoded value, decoded domain value, constructor input, or nominal wrapper. Decode external representations before domain promotion. A direct `Schema.Struct` carrier under an unmodified `Schema.Opaque` maker cannot instantiate subclass instance members; keep emitted behavior static or use a real `Schema.Class` when instances are required.

**Nearest legal counterexample and tradeoff.** Raw HTTP adapters may intentionally return `unknown`/JSON, and a typed discriminant check on already-decoded data is not whole-value validation. A Class-backed Opaque retains construction behavior; static helpers, type-only members, custom carriers, and overridden makers are outside the narrow Opaque invariant. Provider JSON Schema output and SQL generic row types describe transport but do not themselves decode an application domain model.

**Rule ownership.** `boundary-schema-decode` owns JSON/request boundary promotion; `http-response-validation` owns response-domain promotion so the same response is not reported twice; `http-status-decode-order` owns response-specific status classification. `no-schema-opaque-instance-members` owns only the direct Struct-backed, unmodified Opaque case. `no-schema-decode-unknown-sync` keeps the effectful `Schema.decodeUnknownEffect` recommendation current.

**Non-lintable limit.** Arbitrary codecs, indirect decoder flow, protocol framing, and an application's intended domain type cannot be recovered from names or stringified types.

## 5. Keep missing, `undefined`, and invalid distinct

**Mechanism.** `Schema.optionalKey` represents an absent key; `Schema.optional` also permits a present `undefined`. The [schema tests](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/test/schema/Schema.test.ts#L753-L830) demonstrate the different accepted values. Config separately carries input-presence evidence, so wholly absent input, partial input, and malformed input do not collapse; see [Config presence](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Config.ts#L114-L142) and [defaulting tests](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/test/Config.test.ts#L366-L450).

**Invariant.** Choose optional-key semantics only when absence is valid and present `undefined` is not; choose optional-value semantics when both are meaningful. Apply defaults to genuinely absent configuration, not invalid or partially supplied input. Refine a configuration value through the actual Config/Schema operation that consumes that value.

**Nearest legal counterexample and tradeoff.** `optionalKey(Schema.Undefined)` intentionally permits both absence and present `undefined`; directly typed contracts may already let TypeScript enforce the relevant mismatch. `Config.Number` and `Config.Finite` intentionally have different numeric domains. Replacing every optional schema field with `optionalKey` changes a representation contract.

Open index signatures are different: `Schema.Record(Schema.String, Schema.optionalKey(Schema.Number))` throws during construction. Use `Schema.optional(Schema.Number)` for that index value. Finite literal keys can instead represent optional properties. The [index-signature constructor](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/SchemaAST.ts#L2567-L2582) enforces this boundary.

**Rule ownership.** `config-refined-values` owns resolved Config refinement advice. `schema-optional-key` is retired because matching unrelated same-named properties across a file does not connect a schema to its contract. The retained guidance belongs here, not in a name-based replacement rule.

**Non-lintable limit.** Inferred models, transformed codecs, provider behavior, and application meaning of an absent field require an explicit contract rather than lexical property-name matching.

## 6. Bound the actual resource and preserve delivery semantics

**Mechanism.** `Stream.buffer` and `bufferArray` count different units; their strategy can suspend, drop new values, or slide out retained values. [`Stream` delegates the two buffer forms](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Stream.ts#L4579-L4652). `runCollect` retains all produced values, while a preceding `take` can bound output cardinality. A `TxQueue.offerAll` batch executes in one transaction; its [implementation](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/TxQueue.ts#L539-L626) cannot expose a drained prefix to make an oversized bounded batch fit.

**Invariant.** Budget the concrete scarce resource: concurrency, elements, chunks, bytes, retention duration, or retries. Place a finite cardinality bound before collection. Use a capacity at least as large as a required atomic `TxQueue` batch, and restrict that diagnostic to a fresh bounded queue with a finite, nonnegative **integer literal** capacity and a direct no-spread array literal batch.

**Nearest legal counterexample and tradeoff.** Capacity zero is legal rendezvous backpressure. Dropping and sliding are legal but are delivery-loss choices, not equivalent memory fixes. An ordinary bounded `Queue.offerAll` can progress with a consumer; a bounded `TxQueue` batch equal to capacity can wait and commit. Fractional capacity is deliberately outside the rule: `TxQueue.bounded(1.5)` has observed legal behavior and is not evidence for an integer-only runtime API. A timeout does not establish a cardinality or byte bound.

**Rule ownership.** `unbounded-stream-buffer` owns explicit unbounded stream/channel capacity; `unbounded-stream-collect` owns missing locally established collection bounds; `tx-queue-batch-capacity` owns the narrow atomic impossibility. `stream-pagination` owns bounded same-cursor request/update/accumulation relationships.

**Non-lintable limit.** Element counts cannot prove bytes, arbitrary streams may be finite to their caller, and general backpressure, source finiteness, or consumer progress needs runtime and protocol knowledge.

## 7. Separate retry termination, delay, jitter, and idempotence

**Mechanism.** `Schedule.max` stops when any child stops; `Schedule.min` continues while any child remains. [`max`](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Schedule.ts#L618-L660), [`min`](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Schedule.ts#L783-L827), and their [tests](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/test/Schedule.test.ts#L37-L82) distinguish recurrence from delay. Workflow execution identity is recomputed from its tag and payload key, so random/time-based key callbacks change replay identity; see [Workflow execution](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/unstable/workflow/Workflow.ts#L345-L368).

**Invariant.** Specify whether a retry terminates, how it delays, whether jitter is intentional, and whether the external action is safe to repeat. Generate a durable operation ID once in the payload or derive it deterministically from stable payload data; do not compute identity from current time or randomness in a supported durable-key callback.

**Nearest legal counterexample and tradeoff.** Jitter changes delay distribution, not retry count. Deterministic local tests and server-directed pacing can intentionally omit jitter. A constant key can intentionally mean a singleton workflow; an attempt-scoped ID can also be deliberate. A stable queue key only supports the server contract that honors it—an external side effect plus acknowledgment is not automatically exactly-once.

**Rule ownership.** `bounded-retry-schedule` owns known recurrence analysis; `retry-without-jitter` owns the selected known delay policy; `deterministic-durable-key` owns direct nondeterministic durable identity inputs. `idempotent-retry` is retired: function names such as `save` and `fetch` do not establish idempotence.

**Non-lintable limit.** Remote deduplication, error transience, acknowledgment windows, custom schedule behavior, and business idempotence are domain and protocol contracts, not local syntax facts.

## 8. Preserve identity, equality, and cache scope

**Mechanism.** `Equal.byReference` produces a fresh identity proxy each call; retaining that proxy preserves lookup identity, while recreating it does not. [`Equal` identity support](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Equal.ts#L483-L568) is distinct from structural equality, and equal hashes are only a bucket-selection aid, not proof of equality. `Cache.get` shares a pending lookup, tracks consumers and cancellation, and can retain failures; [`Cache` entry ownership](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Cache.ts#L424-L489) differs from `ScopedCache` entry scopes and `RcMap` borrower references.

**Invariant.** Put every semantic input in a key or in its owning context. Choose structural equality, reference identity, and cache lifetime explicitly. When migrating a same-Map value cache, specify TTL policy, failure retention, cancellation, refresh, capacity, and ownership before choosing `Cache`, `ScopedCache`, `RcMap`, or a purpose-built memo.

**Nearest legal counterexample and tradeoff.** A retained `byReference` wrapper is a legal key; creating a fresh wrapper at lookup is not equivalent. A synchronous compiler memo, a protocol-local `WeakMap`, and a per-tenant cache can be correct precisely because their owner supplies missing semantic context. TTL expiry, idle release, access expiry, and failure retention are different policies, not mechanical substitutions.

**Rule ownership.** `prefer-hash-map` and `prefer-hash-set` guidance must use supported identity APIs and retain/reuse wrappers. `cache-preference` owns a same-Map value-cache protocol only after TTL and in-flight protocols are excluded; `handrolled-ttl-cache` owns same-map expiry/clock/delete; `inflight-dedupe-map` owns same-key get-or-start running handles; `scoped-client-cache` owns resource lifetime in ordinary cache lookup. Their precedence is **TTL, then in-flight, then generic value cache**, with one report per protocol.

**Non-lintable limit.** Key completeness, safe sharing across tenants, intended failure caching, and reference escape cannot be proven from map spelling or collection type.

## 9. Keep protected data protected at observation boundaries

**Mechanism.** `Redacted` presents a protected ordinary representation, but `Redacted.value` retrieves the underlying value. See [representation and extraction](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Redacted.ts#L190-L247) and [placeholder behavior tests](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/test/Redacted.test.ts#L17-L48). Telemetry exporters also deliberately bound retries, shutdown, and buffers to avoid turning observation failure into an application failure loop.

**Invariant.** Unwrap a secret only at the operation that requires plaintext, such as an authentication header. At logging, console, telemetry, error, and display boundaries, preserve the `Redacted` representation or deliberately emit approved non-secret metadata.

**Nearest legal counterexample and tradeoff.** `HttpClientRequest.bearerToken(Redacted.value(token))` is a required declassification boundary. A length, hash, or custom transformation is not automatically direct disclosure; nor is every custom logger an untrusted sink. Deliberately lossy telemetry can be correct when full delivery would block shutdown or recursively observe its own failures.

**Rule ownership.** `no-redacted-value-in-logs` owns direct `Redacted.value` flow through enumerated value-preserving syntax into known log sinks. Generic logging policy and exporter reliability remain documentation tradeoffs, not a blanket “never ignore/drop telemetry” rule.

**Non-lintable limit.** General taint, encryption guarantees of a custom sink, transformations, retention systems, and data-classification policy need explicit trust boundaries rather than an ancestor search.

## 10. Separate portable contracts from runtime adapters

**Mechanism.** `HttpClient.make` owns a controller and its runner signal; the fetch adapter forwards that outer-owned signal. See [client ownership](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/unstable/http/HttpClient.ts#L628-L670) and [the fetch adapter](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/unstable/http/FetchHttpClient.ts#L53-L96). D1's transaction acquirer defects, while D1 batch has a different statement-batch contract; see [D1 capability](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/sql/d1/src/D1Client.ts#L320-L354). Text decoding also has transport framing limits: [`Channel.decodeText`](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Channel.ts#L6707-L6721) preserves decoder state but does not establish a general terminal flush contract.

**Invariant.** Keep portable domain contracts separate from the adapter that owns cancellation, framing, cleanup, and backend capability. Pass the actual owned signal to raw fetch. Validate a response when its parsed representation is promoted to a domain value, not when a raw adapter exposes unknown JSON. Use the backend operation it supports rather than treating all `SqlClient` implementations as transaction-equivalent.

**Nearest legal counterexample and tradeoff.** A direct `HttpClient.make` runner may correctly use its outer signal even when an inner `tryPromise` callback has none. Borrowed stdio must not be closed like an owned file. A D1 `batch` is not an automatic replacement for arbitrary `withTransaction` bodies. Reused streaming decoders are legal for complete frames; arbitrary transport fragments require state, but the documented `streaming-textdecoder` scope does not promise EOF-flush enforcement.

**Rule ownership.** `raw-fetch-abort-signal`, `raw-fetch-outside-adapter`, and `http-client-preference` share recognized adapter boundaries; `http-response-validation` and `http-status-decode-order` own response promotion/classification; `no-unsupported-d1-transactions` owns proven D1 transaction use; `streaming-textdecoder` remains limited to proven arbitrary chunk fragmentation.

**Non-lintable limit.** Resource ownership, arbitrary signal graphs, message boundaries, terminal decoder paths, runtime platform capabilities, and custom adapters cannot be inferred from type or pathname alone.

## 11. Preserve language-level and type-level semantics

**Mechanism.** Ordinary functions own dynamic `this`, implicit `arguments`, and `new.target`; `Function.dual` itself uses ordinary invocation semantics and numeric arities 0 and 1 throw. See [dual dispatch](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Function.ts#L111-L158). Effect's `Equal` and `Hash` protocols, schema nominal wrappers, variance annotations, and inference constraints are similarly observable type-and-runtime contracts rather than decoration.

**Invariant.** Convert an ordinary function to an arrow only when it does not rely on its own dynamic receiver, implicit arguments, `new.target`, overload contract, or generator behavior. Pass only supported numeric arities to resolved `Function.dual`; 0 and 1 are invalid runtime configurations. Do not mistake nominal typing for a prototype or assume a type annotation can be discarded without changing inference.

**Nearest legal counterexample and tradeoff.** An ordinary function that reads `arguments` through a nested arrow must stay ordinary; a nested ordinary function's own `arguments` does not exempt the outer function. Predicate-based `Function.dual` dispatch is legal. A fresh `byReference` wrapper also does not preserve native raw-object identity. Type-level variance and inference constraints may be load-bearing even where runtime output looks unchanged.

**Rule ownership.** `no-function-keyword` preserves semantic function exceptions; `valid-effect-dual-arity` owns literal 0/1; `no-schema-opaque-instance-members` owns the direct Opaque prototype mismatch. Hash collection guidance belongs to the cache/identity principle, not a new structural-key mandate.

**Non-lintable limit.** General constructability, hoisting, variance soundness, inference intent, or behavioral equivalence of arbitrary refactors requires program-wide use information and human API judgment.

## 12. Use the correct test runtime and executable documentation

**Mechanism.** Effect Vitest runners interpret `it.effect` and `it.effect.prop` callbacks, while plain `it.prop` treats any return other than `false` as passing and does not run an Effect. See [runner behavior](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/vitest/src/internal/internal.ts#L150-L225). `Effect.sleep` under `TestClock` waits for a clock driver; the correct virtual-time pattern forks the sleeper, advances time, then joins it. See [clock behavior](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/testing/TestClock.ts#L320-L391). Doctest and generator comments are parsed protocols, not free prose; see the [doctest transform](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/tools/doctest/src/Transform.ts#L142-L207).

**Invariant.** Register a callback with a test runtime that actually executes its returned Effect. In a virtual Effect test, provide an independently runnable clock driver before awaiting a positive sleep. Keep machine comments and executable examples syntactically valid for their consumer; edit the authoritative source for generated artifacts.

**Nearest legal counterexample and tradeoff.** Plain `it` plus explicit `Effect.runPromise` can be required to test a runtime boundary without ambient test services; `it.live` can intentionally use real time. Zero sleep, inert schedule construction, a fork/adjust/join sequence, and intentionally interrupted sleepers are legal. JSDoc, exact doctest assertions, and recognized metadata comments are protocols—not prose that must be amended with “because.”

**Rule ownership.** `effect-test-style` owns returned Effect values in plain registrations; `test-clock-for-time` owns the bounded sequential virtual-clock deadlock; `require-because-in-comments` preserves recognized machine forms while keeping the prose rationale policy. `test-sleeps` is retired and merged into `test-clock-for-time`: a blanket ban rejects the canonical fork/sleep/adjust test. Previously accepted executable rule-documentation fixes remain tied to their owning rules.

**Non-lintable limit.** Arbitrary helper-driven clocks, test intent, test isolation, generated artifact ownership, and general example execution require runtime or tool-specific knowledge beyond AST shape.

## 13. Judge immutable APIs by observable ownership, not absence of assignments

**Mechanism.** Effect collection kernels use controlled local mutation, path copying, native backing maps, and memoized arrays while preserving immutable public values. The HAMT [chooses edit or copy by ownership token](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/internal/hashMap.ts#L203-L235), builds in one pass [with reusable local state](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/internal/hashMap.ts#L901-L916), and exposes a bounded mutation facade. `Chunk` also memoizes its flattened backing array; see [its cache](https://github.com/Effect-TS/effect/blob/f9235832c4638437876b96f25b0423d1727b8030/packages/effect/src/Chunk.ts#L409-L424).

**Invariant.** Application code defaults to immutable values and explicit state cells for shared change. Library kernels may use local builders or mutable backing only when ownership, publication, and final immutable behavior are controlled. Treat a mutable implementation detail as an optimization with an observable contract, not a policy exception that spreads to callers.

**Nearest legal counterexample and tradeoff.** A fresh per-run rechunk builder is not shared long-lived state; an exported subscriber map is. A repeated immutable append can copy more than local accumulation, but no performance conclusion follows without a representative benchmark. Internal use of a native `Map` does not make every application `Map` an owned kernel, and absence of assignment does not prove safe ownership through closures or aliases.

**Rule ownership.** The guidance for `no-mutation`, `no-mutable-variable-declarations`, `no-mutable-array-methods`, `prefer-effect-array`, `prefer-hash-map`, and `prefer-hash-set` distinguishes application policy from owned library kernels. It does not add a local-mutation exemption, a new preset, or a universal performance rule.

**Non-lintable limit.** Escape, closure capture, aliasing, publication timing, and performance costs require ownership analysis and measurement; neither lexical locality nor a mutable-looking implementation is sufficient proof.

## Retired predicates and compatibility

The approved removals are deliberate compatibility changes, not no-op aliases: `test-sleeps` is merged into `test-clock-for-time`; `idempotent-retry`, `cache-per-request`, `prefer-effect-schema-is`, `prefer-effect-schema-guard`, and `schema-optional-key` are retired. Their guidance is preserved above, but their unsound predicates are not replaced by name matching, blanket substitutions, or invented configuration metadata. Configurations selecting those rule names must migrate deliberately.

These principles are version-specific to the pinned Effect snapshot. They do not promise historical v3 APIs, a general taint/CFG/call-graph analysis, universal resource cleanup, universal finiteness, automatic rewrites, or proof of business intent.