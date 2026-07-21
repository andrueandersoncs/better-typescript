import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import { makeEffectQualityRulesMatcher } from "@better-typescript/matchers/builtins/effectQuality/effectQuality"
import {
  EffectQualityRuleData,
  type EffectQualityRuleKind
} from "@better-typescript/matchers/builtins/effectQuality/data"
import {
  defaultEffectQualityPolicy,
  type EffectQualityPolicy
} from "@better-typescript/matchers/builtins/effectQuality/policy"
import { defineBuiltinPolicy } from "../definePolicy.js"

const ruleMessages: Readonly<Record<EffectQualityRuleKind, string>> = {
  "unsafe-casts": "Avoid unchecked `as any` assertions in Effect code.",
  "schema-class-models":
    "Avoid Schema class data models; use Schema.Struct or tagged schema variants.",
  "typescript-namespaces": "Avoid TypeScript namespaces for Effect module organization.",
  "process-environment": "Read runtime configuration through Effect Config, not process.env.",
  "test-sleeps": "Avoid Effect.sleep in tests; synchronize deterministically.",
  "production-sleep-loops": "Avoid manual Effect.sleep loops; use Schedule and Effect.repeat.",
  "unbounded-stream-collect": "Avoid collecting an unbounded production Stream.",
  "unbounded-stream-buffer": "Avoid unbounded Stream buffers.",
  "handrolled-ttl-cache": "Avoid a hand-rolled TTL Map cache when Effect Cache fits.",
  "inflight-dedupe-map": "Avoid a hand-rolled in-flight deduplication Map when Effect Cache fits.",
  "cache-per-request": "Construct Cache once in its owning layer or scope, not per request.",
  "scoped-client-cache":
    "Acquire clients outside Cache lookup functions and share them through a layer.",
  "raw-fetch-abort-signal": "Pass Effect.tryPromise's AbortSignal to raw fetch.",
  "typed-error-recovery": "Use typed error recovery instead of broad cause recovery.",
  "layer-forever-acquisition":
    "Fork long-lived work into the layer scope so acquisition completes.",
  "global-config-mutation":
    "Avoid mutating process.env in tests; provide deterministic Config instead.",
  "service-method-effect-fn": "Wrap public Effect service operations with a named Effect.fn.",
  "effect-fn-name": "Use a non-empty domain-qualified Effect.fn name.",
  "schema-record-interface": "Pair a Schema.Struct record with its same-name interface.",
  "schema-optional-key":
    "Use Schema.optionalKey for absent fields unless undefined is contractual.",
  "schema-error-class": "Use Schema.TaggedErrorClass for typed Effect errors.",
  "config-secret-redaction": "Read credentials with Config.redacted.",
  "bounded-retry-schedule":
    "Use a bounded retry schedule unless a local waiver documents forever retry.",
  "http-response-validation":
    "Decode unknown HTTP response data with Schema at the adapter boundary.",
  "http-status-decode-order": "Classify HTTP status before decoding a successful response body.",
  "effect-test-style": "Use it.effect for Effect tests."
}

const ruleHints: Readonly<Record<EffectQualityRuleKind, string>> = {
  "unsafe-casts":
    "Model the missing invariant with Schema decoding, a branded type, or a verified narrowing predicate.",
  "schema-class-models": "Keep ordinary data declarative and decode it at the boundary.",
  "typescript-namespaces": "Export an ES module namespace projection or named values instead.",
  "process-environment":
    "Read the key in a Config-backed layer and provide deterministic config in tests.",
  "test-sleeps": "Use TestClock, Deferred, Queue, Latch, Ref, or an explicit test hook.",
  "production-sleep-loops": "Express repetition, pacing, and backoff as an Effect Schedule.",
  "unbounded-stream-collect":
    "Consume the stream incrementally with runForEach, runDrain, or a bounded take.",
  "unbounded-stream-buffer": "Use natural backpressure or a bounded buffer strategy.",
  "handrolled-ttl-cache":
    "Use Cache.make or Cache.makeWith when its lifecycle and eviction semantics fit.",
  "inflight-dedupe-map": "Cache.get shares an in-flight lookup for the same missing key.",
  "cache-per-request":
    "Create the cache during layer acquisition and close over the shared handle.",
  "scoped-client-cache":
    "Build the client once in the owning layer, then make lookup a plain call.",
  "raw-fetch-abort-signal": "Accept the tryPromise signal and pass it as fetch's init.signal.",
  "typed-error-recovery":
    "Use catchIf, catchTag, catchFilter, or retry for expected typed failures.",
  "layer-forever-acquisition": "Run the worker with Effect.forkScoped, FiberSet, or FiberMap.",
  "global-config-mutation": "Use ConfigProvider.fromUnknown or a test configuration service.",
  "service-method-effect-fn":
    "Name the operation Domain.operation and keep the generator body focused on its workflow.",
  "effect-fn-name": "Use a stable name such as UserRepo.get for tracing and spans.",
  "schema-record-interface": "Export the decoded interface beside the Schema.Struct declaration.",
  "schema-optional-key":
    "Use optionalKey for absent JSON keys; reserve optional for explicit undefined.",
  "schema-error-class":
    "Map boundary failures into a tagged schema error with useful operation context.",
  "config-secret-redaction":
    "Redacted values preserve operational use while preventing accidental disclosure.",
  "bounded-retry-schedule": "Use recurs or upTo to make retries operationally bounded.",
  "http-response-validation":
    "Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.",
  "http-status-decode-order": "Apply filterStatusOk or an equivalent response classifier first.",
  "effect-test-style": "Effect-aware tests provide the correct runtime and deterministic services."
}

const effectQualityRulesFindings = (match: Match<EffectQualityRuleData>) =>
  oneFinding(match.target, ruleMessages[match.fact.kind], ruleHints[match.fact.kind], match.fact)

export const makeEffectQualityRules = (policy: EffectQualityPolicy) => {
  const matcher = makeEffectQualityRulesMatcher(policy)

  return defineBuiltinPolicy(
    "effect-quality-rules",
    matcher,
    Function.constant(effectQualityRulesFindings)
  )
}

export const effectQualityRules = makeEffectQualityRules(defaultEffectQualityPolicy)
