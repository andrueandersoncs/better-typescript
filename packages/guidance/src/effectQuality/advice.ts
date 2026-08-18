import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import {
  Array,
  Data,
  Effect,
  Function,
  HashMap,
  Option,
  Result,
  Schema,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import { EffectQualityAdviceData } from "@better-typescript/matchers/builtins/effectQuality/effectQualityAdviceData"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { makePackageExamples } from "../makePackageExamples.js"
import { EffectQualityRuleData } from "@better-typescript/matchers/builtins/effectQuality/effectQualityRuleData"
import { makeEffectQualityRulesMatcher } from "@better-typescript/matchers/builtins/effectQuality/effectQualityRulesMatcher"
import { EffectQualityPolicy } from "@better-typescript/matchers/builtins/effectQuality/effectQualityPolicy"
import { defaultEffectQualityPolicy } from "@better-typescript/matchers/builtins/effectQuality/defaultEffectQualityPolicy"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { makeEffectQualityEvidenceMatcher } from "@better-typescript/matchers/builtins/effectQuality/effectQualityEvidenceModule"

import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Match } from "@better-typescript/matchers/matcher/match"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { strictEqual } from "@better-typescript/matchers/equivalence"

// Effect-quality wiring is authored once because registration must not restate each entry.
const buildEffectQualityExports = () => {
  class EffectQualityAdviceCopy extends Data.Class<{
    readonly kind: string
    readonly title: string
    readonly remediation: string
  }> {}

  const configRefinedValuesAdviceCopy = new EffectQualityAdviceCopy({
    kind: "config-refined-values",
    title: "refine configuration values",
    remediation: "Use Config.schema or Config.mapOrFail for path, URL, port, and identifier values."
  })

  const retryWithoutJitterAdviceCopy = new EffectQualityAdviceCopy({
    kind: "retry-without-jitter",
    title: "jitter exponential retry",
    remediation: "Add Schedule.jittered to the bounded backoff schedule."
  })

  const rawFetchOutsideAdapterAdviceCopy = new EffectQualityAdviceCopy({
    kind: "raw-fetch-outside-adapter",
    title: "keep raw fetch in an adapter",
    remediation: "Move raw fetch behind a named adapter boundary or use Effect HttpClient."
  })

  const testLiveRuntimeAdviceCopy = new EffectQualityAdviceCopy({
    kind: "test-live-runtime",
    title: "justify a live Effect test",
    remediation: "Prefer it.effect unless this test intentionally proves live runtime behavior."
  })

  const testClockForTimeAdviceCopy = new EffectQualityAdviceCopy({
    kind: "test-clock-for-time",
    title: "use TestClock for time-sensitive tests",
    remediation: "Fork time-dependent work, then advance TestClock instead of real time."
  })

  const thinHttpHandlersAdviceCopy = new EffectQualityAdviceCopy({
    kind: "thin-http-handlers",
    title: "keep HTTP handlers thin",
    remediation: "Decode input, call a service, and map typed failures to transport responses."
  })

  const transactionNetworkWorkAdviceCopy = new EffectQualityAdviceCopy({
    kind: "transaction-network-work",
    title: "keep network work outside transactions",
    remediation:
      "Complete provider and network calls before entering the authoritative transaction."
  })

  const layerAuthorityVisibilityAdviceCopy = new EffectQualityAdviceCopy({
    kind: "layer-authority-visibility",
    title: "make layer authority explicit",
    remediation:
      "Do not hide credentials, persistence, or transports behind a default Context.Reference."
  })

  const layerCompositionAdviceCopy = new EffectQualityAdviceCopy({
    kind: "layer-composition",
    title: "make layer composition intentional",
    remediation: "Name the layer subgraph and make its exposed dependencies intentional."
  })

  const scopedBackgroundWorkAdviceCopy = new EffectQualityAdviceCopy({
    kind: "scoped-background-work",
    title: "scope background work",
    remediation: "Own worker lifetime in a Layer and fork it into that scope."
  })

  const cachePreferenceAdviceCopy = new EffectQualityAdviceCopy({
    kind: "cache-preference",
    title: "prefer Effect Cache",
    remediation: "Use Cache.make or Cache.makeWith when its lifecycle semantics fit."
  })

  const streamPaginationAdviceCopy = new EffectQualityAdviceCopy({
    kind: "stream-pagination",
    title: "prefer Stream.paginate",
    remediation: "Use Stream.paginate for an effectful token-based page source."
  })

  const publicQueueAdviceCopy = new EffectQualityAdviceCopy({
    kind: "public-queue",
    title: "expose streams instead of queues",
    remediation:
      "Keep Queue, PubSub, and SubscriptionRef implementation-private; publish Stream values."
  })

  const keyedStreamWorkAdviceCopy = new EffectQualityAdviceCopy({
    kind: "keyed-stream-work",
    title: "centralize keyed stream work",
    remediation:
      "Use a named FiberMap-based helper so per-key serialization is explicit and reusable."
  })

  const typedBoundaryErrorAdviceCopy = new EffectQualityAdviceCopy({
    kind: "typed-boundary-error",
    title: "map boundary failures to typed domain errors",
    remediation:
      "Translate infrastructure failures at the adapter seam into an operation-labelled domain error."
  })

  const boundarySchemaDecodeAdviceCopy = new EffectQualityAdviceCopy({
    kind: "boundary-schema-decode",
    title: "decode unknown boundary data",
    remediation:
      "Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value."
  })

  const idempotentRetryAdviceCopy = new EffectQualityAdviceCopy({
    kind: "idempotent-retry",
    title: "retry only idempotent operations",
    remediation: "Retry only operations whose idempotency is established by the domain contract."
  })

  const observableWorkerFailureAdviceCopy = new EffectQualityAdviceCopy({
    kind: "observable-worker-failure",
    title: "make worker failures observable",
    remediation:
      "Log expected item failures or make the skip policy explicit at the owning worker boundary."
  })

  const httpClientPreferenceAdviceCopy = new EffectQualityAdviceCopy({
    kind: "http-client-preference",
    title: "prefer Effect HttpClient in adapters",
    remediation:
      "Prefer Effect's typed HTTP client unless a documented raw-fetch exception applies."
  })

  const adviceCopyRows = Array.make(
    configRefinedValuesAdviceCopy,
    retryWithoutJitterAdviceCopy,
    rawFetchOutsideAdapterAdviceCopy,
    testLiveRuntimeAdviceCopy,
    testClockForTimeAdviceCopy,
    thinHttpHandlersAdviceCopy,
    transactionNetworkWorkAdviceCopy,
    layerAuthorityVisibilityAdviceCopy,
    layerCompositionAdviceCopy,
    scopedBackgroundWorkAdviceCopy,
    cachePreferenceAdviceCopy,
    streamPaginationAdviceCopy,
    publicQueueAdviceCopy,
    keyedStreamWorkAdviceCopy,
    typedBoundaryErrorAdviceCopy,
    boundarySchemaDecodeAdviceCopy,
    idempotentRetryAdviceCopy,
    observableWorkerFailureAdviceCopy,
    httpClientPreferenceAdviceCopy
  )

  const makeAdviceCopyEntry = (row: EffectQualityAdviceCopy) => Tuple.make(row.kind, row)
  const adviceCopyEntries = Array.map(adviceCopyRows, makeAdviceCopyEntry)
  const adviceCopyByKind = HashMap.fromIterable(adviceCopyEntries)
  const effectQualityAdviceSignalName = "effect-quality-advice-evidence"
  const isEffectQualityAdviceSignalName = strictEqual(effectQualityAdviceSignalName)

  const isEffectQualityAdviceSignal = (signal: Signal) =>
    isEffectQualityAdviceSignalName(signal.name)

  const evidenceDetections = (signals: ReadonlyArray<Signal>) =>
    pipe(
      Array.findFirst(signals, isEffectQualityAdviceSignal),
      Option.map(Struct.get("detections")),
      Option.getOrElse(Array.empty<Signal["detections"][number]>)
    )

  const hasEffectQualityAdviceData = (
    detection: Signal["detections"][number]
  ): detection is Signal["detections"][number] & {
    readonly data: Schema.Schema.Type<typeof EffectQualityAdviceData>
  } => Schema.is(EffectQualityAdviceData)(detection.data)

  const adviceFromDetection = (detection: Signal["detections"][number]) => {
    if (!hasEffectQualityAdviceData(detection)) {
      return Result.failVoid
    }

    const copyOption = HashMap.get(adviceCopyByKind, detection.data.kind)

    const toAdvice = (copy: EffectQualityAdviceCopy) => {
      const evidenceItem = EvidenceItem.make({ measure: detection.data.subject, count: 1 })
      const evidence = Array.of(evidenceItem)
      const examples = makePackageExamples("effect-quality")

      return Advice.make({
        location: detection.location,
        level: "file",
        title: copy.title,
        remediation: copy.remediation,
        evidence,
        examples
      })
    }

    return pipe(copyOption, Option.map(toAdvice), Result.fromOption(Function.constVoid))
  }

  const effectQualityDerive = Effect.fn("EffectQuality.derive")(
    flow(evidenceDetections, Array.filterMap(adviceFromDetection), Effect.succeed)
  )

  class EffectQualityRuleCopy extends Data.Class<{
    readonly kind: string
    readonly message: string
    readonly hint: string
  }> {}

  const unsafeCastsRuleCopy = new EffectQualityRuleCopy({
    kind: "unsafe-casts",
    message: "Avoid unchecked `as any` assertions in Effect code.",
    hint: "Model the missing invariant with Schema decoding, a branded type, or a verified narrowing predicate."
  })

  const schemaClassModelsRuleCopy = new EffectQualityRuleCopy({
    kind: "schema-class-models",
    message: "Avoid Schema class data models; use Schema.Struct or tagged schema variants.",
    hint: "Keep ordinary data declarative and decode it at the boundary."
  })

  const typescriptNamespacesRuleCopy = new EffectQualityRuleCopy({
    kind: "typescript-namespaces",
    message: "Avoid TypeScript namespaces for Effect module organization.",
    hint: "Export an ES module namespace projection or named values instead."
  })

  const processEnvironmentRuleCopy = new EffectQualityRuleCopy({
    kind: "process-environment",
    message: "Read runtime configuration through Effect Config, not process.env.",
    hint: "Read the key in a Config-backed layer and provide deterministic config in tests."
  })

  const testSleepsRuleCopy = new EffectQualityRuleCopy({
    kind: "test-sleeps",
    message: "Avoid Effect.sleep in tests; synchronize deterministically.",
    hint: "Use TestClock, Deferred, Queue, Latch, Ref, or an explicit test hook."
  })

  const productionSleepLoopsRuleCopy = new EffectQualityRuleCopy({
    kind: "production-sleep-loops",
    message: "Avoid manual Effect.sleep loops; use Schedule and Effect.repeat.",
    hint: "Express repetition, pacing, and backoff as an Effect Schedule."
  })

  const unboundedStreamCollectRuleCopy = new EffectQualityRuleCopy({
    kind: "unbounded-stream-collect",
    message: "Avoid collecting an unbounded production Stream.",
    hint: "Consume the stream incrementally with runForEach, runDrain, or a bounded take."
  })

  const unboundedStreamBufferRuleCopy = new EffectQualityRuleCopy({
    kind: "unbounded-stream-buffer",
    message: "Avoid unbounded Stream buffers.",
    hint: "Use natural backpressure or a bounded buffer strategy."
  })

  const handrolledTtlCacheRuleCopy = new EffectQualityRuleCopy({
    kind: "handrolled-ttl-cache",
    message: "Avoid a hand-rolled TTL Map cache when Effect Cache fits.",
    hint: "Use Cache.make or Cache.makeWith when its lifecycle and eviction semantics fit."
  })

  const inflightDedupeMapRuleCopy = new EffectQualityRuleCopy({
    kind: "inflight-dedupe-map",
    message: "Avoid a hand-rolled in-flight deduplication Map when Effect Cache fits.",
    hint: "Cache.get shares an in-flight lookup for the same missing key."
  })

  const cachePerRequestRuleCopy = new EffectQualityRuleCopy({
    kind: "cache-per-request",
    message: "Construct Cache once in its owning layer or scope, not per request.",
    hint: "Create the cache during layer acquisition and close over the shared handle."
  })

  const scopedClientCacheRuleCopy = new EffectQualityRuleCopy({
    kind: "scoped-client-cache",
    message: "Acquire clients outside Cache lookup functions and share them through a layer.",
    hint: "Build the client once in the owning layer, then make lookup a plain call."
  })

  const rawFetchAbortSignalRuleCopy = new EffectQualityRuleCopy({
    kind: "raw-fetch-abort-signal",
    message: "Pass Effect.tryPromise's AbortSignal to raw fetch.",
    hint: "Accept the tryPromise signal and pass it as fetch's init.signal."
  })

  const typedErrorRecoveryRuleCopy = new EffectQualityRuleCopy({
    kind: "typed-error-recovery",
    message: "Use typed error recovery instead of broad cause recovery.",
    hint: "Use catchIf, catchTag, catchFilter, or retry for expected typed failures."
  })

  const layerForeverAcquisitionRuleCopy = new EffectQualityRuleCopy({
    kind: "layer-forever-acquisition",
    message: "Fork long-lived work into the layer scope so acquisition completes.",
    hint: "Run the worker with Effect.forkScoped, FiberSet, or FiberMap."
  })

  const globalConfigMutationRuleCopy = new EffectQualityRuleCopy({
    kind: "global-config-mutation",
    message: "Avoid mutating process.env in tests; provide deterministic Config instead.",
    hint: "Use ConfigProvider.fromUnknown or a test configuration service."
  })

  const serviceMethodEffectFnRuleCopy = new EffectQualityRuleCopy({
    kind: "service-method-effect-fn",
    message: "Wrap public Effect service operations with a named Effect.fn.",
    hint: "Name the operation Domain.operation and keep the generator body focused on its workflow."
  })

  const effectFnNameRuleCopy = new EffectQualityRuleCopy({
    kind: "effect-fn-name",
    message: "Use a non-empty domain-qualified Effect.fn name.",
    hint: "Use a stable name such as UserRepo.get for tracing and spans."
  })

  const schemaRecordInterfaceRuleCopy = new EffectQualityRuleCopy({
    kind: "schema-record-interface",
    message: "Pair a Schema.Struct record with its same-name interface.",
    hint: "Export the decoded interface beside the Schema.Struct declaration."
  })

  const schemaOptionalKeyRuleCopy = new EffectQualityRuleCopy({
    kind: "schema-optional-key",
    message: "Use Schema.optionalKey for absent fields unless undefined is contractual.",
    hint: "Use optionalKey for absent JSON keys; reserve optional for explicit undefined."
  })

  const schemaErrorClassRuleCopy = new EffectQualityRuleCopy({
    kind: "schema-error-class",
    message: "Use Schema.TaggedErrorClass for typed Effect errors.",
    hint: "Map boundary failures into a tagged schema error with useful operation context."
  })

  const configSecretRedactionRuleCopy = new EffectQualityRuleCopy({
    kind: "config-secret-redaction",
    message: "Read credentials with Config.redacted.",
    hint: "Redacted values preserve operational use while preventing accidental disclosure."
  })

  const boundedRetryScheduleRuleCopy = new EffectQualityRuleCopy({
    kind: "bounded-retry-schedule",
    message: "Use a bounded retry schedule unless a local waiver documents forever retry.",
    hint: "Use recurs or upTo to make retries operationally bounded."
  })

  const httpResponseValidationRuleCopy = new EffectQualityRuleCopy({
    kind: "http-response-validation",
    message: "Decode unknown HTTP response data with Schema at the adapter boundary.",
    hint: "Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder."
  })

  const httpStatusDecodeOrderRuleCopy = new EffectQualityRuleCopy({
    kind: "http-status-decode-order",
    message: "Classify HTTP status before decoding a successful response body.",
    hint: "Apply filterStatusOk or an equivalent response classifier first."
  })

  const effectTestStyleRuleCopy = new EffectQualityRuleCopy({
    kind: "effect-test-style",
    message: "Use it.effect for Effect tests.",
    hint: "Effect-aware tests provide the correct runtime and deterministic services."
  })

  const ruleCopyRows = Array.make(
    unsafeCastsRuleCopy,
    schemaClassModelsRuleCopy,
    typescriptNamespacesRuleCopy,
    processEnvironmentRuleCopy,
    testSleepsRuleCopy,
    productionSleepLoopsRuleCopy,
    unboundedStreamCollectRuleCopy,
    unboundedStreamBufferRuleCopy,
    handrolledTtlCacheRuleCopy,
    inflightDedupeMapRuleCopy,
    cachePerRequestRuleCopy,
    scopedClientCacheRuleCopy,
    rawFetchAbortSignalRuleCopy,
    typedErrorRecoveryRuleCopy,
    layerForeverAcquisitionRuleCopy,
    globalConfigMutationRuleCopy,
    serviceMethodEffectFnRuleCopy,
    effectFnNameRuleCopy,
    schemaRecordInterfaceRuleCopy,
    schemaOptionalKeyRuleCopy,
    schemaErrorClassRuleCopy,
    configSecretRedactionRuleCopy,
    boundedRetryScheduleRuleCopy,
    httpResponseValidationRuleCopy,
    httpStatusDecodeOrderRuleCopy,
    effectTestStyleRuleCopy
  )

  const makeRuleCopyEntry = (row: EffectQualityRuleCopy) => Tuple.make(row.kind, row)
  const ruleCopyEntries = Array.map(ruleCopyRows, makeRuleCopyEntry)
  const ruleCopyByKind = HashMap.fromIterable(ruleCopyEntries)

  const makeEffectQualityRulesFindings = (match: Match<EffectQualityRuleData>) => {
    const fallbackFindings = makeFindings(
      match.target,
      match.fact.kind,
      match.fact.kind,
      match.fact
    )

    const fallback = Function.constant(fallbackFindings)

    const makeFindingsFromCopy = (copy: EffectQualityRuleCopy) =>
      makeFindings(match.target, copy.message, copy.hint, match.fact)

    return pipe(
      HashMap.get(ruleCopyByKind, match.fact.kind),
      Option.map(makeFindingsFromCopy),
      Option.getOrElse(fallback)
    )
  }

  const makeEffectQualityPolicies = (policy: EffectQualityPolicy) => {
    const rulesMatcher = makeEffectQualityRulesMatcher(policy)

    const qualityRules = makeBuiltinPolicy({
      name: "effect-quality-rules",
      matcher: rulesMatcher,
      guidance: Function.constant(makeEffectQualityRulesFindings),
      reported: true,
      stage: "program"
    })

    // Silent evidence carries kind/subject only because derive owns user-facing advice prose.
    const makeEffectQualityAdviceEvidenceFindings = (match: Match<EffectQualityAdviceData>) =>
      makeFindings(match.target, match.fact.kind, match.fact.subject, match.fact)

    const evidenceMatcher = makeEffectQualityEvidenceMatcher(policy)

    const qualityAdviceEvidence = makeBuiltinPolicy({
      name: "effect-quality-advice-evidence",
      matcher: evidenceMatcher,
      guidance: Function.constant(makeEffectQualityAdviceEvidenceFindings),
      reported: false,
      stage: "program"
    })

    return Array.make(qualityRules, qualityAdviceEvidence)
  }

  const makeEffectQualityWiring = (policy: EffectQualityPolicy) => {
    const qualityPolicies = makeEffectQualityPolicies(policy)

    return makeWiring({
      policies: qualityPolicies,
      derive: effectQualityDerive
    })
  }

  const effectQualityWiring = makeEffectQualityWiring(defaultEffectQualityPolicy)

  return Tuple.make(
    effectQualityDerive,
    makeEffectQualityPolicies,
    makeEffectQualityWiring,
    effectQualityWiring
  )
}

export const [
  effectQualityDerive,
  makeEffectQualityPolicies,
  makeEffectQualityWiring,
  effectQualityWiring
] = buildEffectQualityExports()
