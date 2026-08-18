import { Array } from "effect"
import { EffectQualityRuleData } from "./internal/builtins/effectQuality/effectQualityRuleData.js"
import { effectQualityRuleChecks } from "./internal/builtins/effectQuality/effectQualityRuleChecks.js"
import { makeEffectQualityRuleScanner } from "./internal/builtins/effectQuality/effectQualityRuleScanner.js"
import type { EffectQualityRuleCheck } from "./internal/builtins/effectQuality/effectQualityRuleCheck.js"
import { makeRule } from "./internal/rule/makeRule.js"
import { makeRuleMessage } from "./internal/rule/makeRuleMessage.js"
import type { RuleMessage, RuleMessageCopy } from "./internal/rule/ruleMessage.js"

const syntaxCopy = {
  "unsafe-casts": {
    message: "Avoid unchecked `as any` assertions in Effect code.",
    hint: "Model the missing invariant with Schema decoding, a branded type, or a verified narrowing predicate."
  },
  "schema-class-models": {
    message: "Avoid Schema class data models; use Schema.Struct or tagged schema variants.",
    hint: "Keep ordinary data declarative and decode it at the boundary."
  },
  "typescript-namespaces": {
    message: "Avoid TypeScript namespaces for Effect module organization.",
    hint: "Export an ES module namespace projection or named values instead."
  },
  "process-environment": {
    message: "Read runtime configuration through Effect Config, not process.env.",
    hint: "Read the key in a Config-backed layer and provide deterministic config in tests."
  },
  "test-sleeps": {
    message: "Avoid Effect.sleep in tests; synchronize deterministically.",
    hint: "Use TestClock, Deferred, Queue, Latch, Ref, or an explicit test hook."
  },
  "production-sleep-loops": {
    message: "Avoid manual Effect.sleep loops; use Schedule and Effect.repeat.",
    hint: "Express repetition, pacing, and backoff as an Effect Schedule."
  },
  "unbounded-stream-collect": {
    message: "Avoid collecting an unbounded production Stream.",
    hint: "Consume the stream incrementally with runForEach, runDrain, or a bounded take."
  },
  "unbounded-stream-buffer": {
    message: "Avoid unbounded Stream buffers.",
    hint: "Use natural backpressure or a bounded buffer strategy."
  },
  "handrolled-ttl-cache": {
    message: "Avoid a hand-rolled TTL Map cache when Effect Cache fits.",
    hint: "Use Cache.make or Cache.makeWith when its lifecycle and eviction semantics fit."
  },
  "inflight-dedupe-map": {
    message: "Avoid a hand-rolled in-flight deduplication Map when Effect Cache fits.",
    hint: "Cache.get shares an in-flight lookup for the same missing key."
  },
  "cache-per-request": {
    message: "Construct Cache once in its owning layer or scope, not per request.",
    hint: "Create the cache during layer acquisition and close over the shared handle."
  },
  "scoped-client-cache": {
    message: "Acquire clients outside Cache lookup functions and share them through a layer.",
    hint: "Build the client once in the owning layer, then make lookup a plain call."
  },
  "raw-fetch-abort-signal": {
    message: "Pass Effect.tryPromise's AbortSignal to raw fetch.",
    hint: "Accept the tryPromise signal and pass it as fetch's init.signal."
  },
  "typed-error-recovery": {
    message: "Use typed error recovery instead of broad cause recovery.",
    hint: "Use catchIf, catchTag, catchFilter, or retry for expected typed failures."
  },
  "layer-forever-acquisition": {
    message: "Fork long-lived work into the layer scope so acquisition completes.",
    hint: "Run the worker with Effect.forkScoped, FiberSet, or FiberMap."
  },
  "global-config-mutation": {
    message: "Avoid mutating process.env in tests; provide deterministic Config instead.",
    hint: "Use ConfigProvider.fromUnknown or a test configuration service."
  },
  "service-method-effect-fn": {
    message: "Wrap public Effect service operations with a named Effect.fn.",
    hint: "Name the operation Domain.operation and keep the generator body focused on its workflow."
  },
  "effect-fn-name": {
    message: "Use a non-empty domain-qualified Effect.fn name.",
    hint: "Use a stable name such as UserRepo.get for tracing and spans."
  },
  "schema-record-interface": {
    message: "Pair a Schema.Struct record with its same-name interface.",
    hint: "Export the decoded interface beside the Schema.Struct declaration."
  },
  "schema-optional-key": {
    message: "Use Schema.optionalKey for absent fields unless undefined is contractual.",
    hint: "Use optionalKey for absent JSON keys; reserve optional for explicit undefined."
  },
  "schema-error-class": {
    message: "Use Schema.TaggedErrorClass for typed Effect errors.",
    hint: "Map boundary failures into a tagged schema error with useful operation context."
  },
  "bounded-retry-schedule": {
    message: "Use a bounded retry schedule unless a local waiver documents forever retry.",
    hint: "Use recurs or upTo to make retries operationally bounded."
  },
  "http-response-validation": {
    message: "Decode unknown HTTP response data with Schema at the adapter boundary.",
    hint: "Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder."
  },
  "http-status-decode-order": {
    message: "Classify HTTP status before decoding a successful response body.",
    hint: "Apply filterStatusOk or an equivalent response classifier first."
  },
  "effect-test-style": {
    message: "Use it.effect for Effect tests.",
    hint: "Effect-aware tests provide the correct runtime and deterministic services."
  }
}

const treeCopy = {
  "boundary-schema-decode": {
    message: "Decode unknown boundary data.",
    hint: "Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value."
  },
  "cache-preference": {
    message: "Prefer Effect Cache when its lifecycle semantics fit.",
    hint: "Use Cache.make or Cache.makeWith instead of a hand-rolled cache."
  },
  "config-refined-values": {
    message: "Refine configuration values.",
    hint: "Use Config.schema or Config.mapOrFail for path, URL, port, and identifier values."
  },
  "http-client-preference": {
    message: "Prefer Effect HttpClient for HTTP adapters.",
    hint: "Use Effect's typed HTTP client unless a documented raw-fetch exception applies."
  },
  "idempotent-retry": {
    message: "Retry only idempotent operations.",
    hint: "Establish idempotency in the domain contract before applying retry."
  },
  "observable-worker-failure": {
    message: "Make worker failures observable.",
    hint: "Log expected item failures or make the skip policy explicit at the owning worker boundary."
  },
  "raw-fetch-outside-adapter": {
    message: "Keep raw fetch in an adapter.",
    hint: "Move raw fetch behind a named adapter boundary or use Effect HttpClient."
  },
  "retry-without-jitter": {
    message: "Jitter exponential retry.",
    hint: "Add Schedule.jittered to the bounded backoff schedule."
  },
  "scoped-background-work": {
    message: "Scope background work.",
    hint: "Own worker lifetime in a Layer and fork it into that scope."
  },
  "stream-pagination": {
    message: "Prefer Stream.paginate.",
    hint: "Use Stream.paginate for an effectful token-based page source."
  },
  "test-clock-for-time": {
    message: "Use TestClock for time-sensitive tests.",
    hint: "Fork time-dependent work, then advance TestClock instead of real time."
  },
  "typed-boundary-error": {
    message: "Map boundary failures to typed domain errors.",
    hint: "Translate infrastructure failures at the adapter seam into an operation-labelled domain error."
  }
}

const ruleCopy: Readonly<Record<EffectQualityRuleData["kind"], RuleMessageCopy>> = {
  ...syntaxCopy,
  ...treeCopy
}

const makeEffectQualityRuleMessage =
  (name: EffectQualityRuleData["kind"]): RuleMessage<EffectQualityRuleData> =>
  () =>
  (_candidate) => {
    const copy = ruleCopy[name]

    return makeRuleMessage(copy.message, copy.hint)
  }

const makeEffectQualityRule = (check: EffectQualityRuleCheck) => {
  const scanner = makeEffectQualityRuleScanner(check)
  const message = makeEffectQualityRuleMessage(check.kind)

  return makeRule(check.kind)(scanner)(message)
}

export const effectQualityRules = Array.map(effectQualityRuleChecks, makeEffectQualityRule)
