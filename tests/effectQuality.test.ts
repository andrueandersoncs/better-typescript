import * as assert from "node:assert/strict"
import { test } from "bun:test"
import type { Detection } from "@better-typescript/core/engine/location/detectionData"
import { EffectQualityAdviceData } from "@better-typescript/matchers/builtins/effectQuality/effectQualityAdviceData"
import { EffectQualityRuleData } from "@better-typescript/matchers/builtins/effectQuality/effectQualityRuleData"
import { effectQualityWiring } from "@better-typescript/guidance/effectQuality/advice"
import { Schema } from "effect"
import { runSignals } from "./effectQualityRunSignals.js"

test("Effect-quality wiring reports exact local rules and preserves allowed cases", async () => {
  const signals = await runSignals()
  const rules = signals.find((candidate) => candidate.name === "effect-quality-rules")
  assert.ok(rules)
  const ruleSummary = (detection: Detection) => {
    assert.ok(Schema.is(EffectQualityRuleData)(detection.data))
    return `${detection.location.path}:${detection.location.line}:${detection.data.kind}:${detection.data.subject}`
  }
  const actual = rules.detections.map(ruleSummary).sort()

  assert.deepEqual(
    actual,
    [
      "src/adapters/http.ts:3:raw-fetch-abort-signal:fetch",
      "src/adapters/http.ts:3:service-method-effect-fn:fetchWithoutAbort",
      "src/adapters/http.ts:9:http-response-validation:response.json",
      "src/adapters/http.ts:9:http-status-decode-order:response.json",
      "src/application/rules.ts:101:service-method-effect-fn:requestCache",
      "src/application/rules.ts:102:cache-per-request:Cache.make",
      "src/application/rules.ts:108:service-method-effect-fn:cacheWithClient",
      "src/application/rules.ts:111:scoped-client-cache:Layer.build(Layer.empty)",
      "src/application/rules.ts:113:bounded-retry-schedule:Effect.retry",
      "src/application/rules.ts:113:service-method-effect-fn:exponentialRetry",
      "src/application/rules.ts:115:service-method-effect-fn:broadRecovery",
      "src/application/rules.ts:116:typed-error-recovery:catchCause",
      "src/application/rules.ts:11:schema-class-models:ClassModel",
      "src/application/rules.ts:11:schema-class-models:effect:Schema.Class",
      "src/application/rules.ts:125:bounded-retry-schedule:Effect.retry",
      "src/application/rules.ts:125:service-method-effect-fn:foreverRetry",
      "src/application/rules.ts:15:schema-record-interface:User",
      "src/application/rules.ts:16:schema-optional-key:email",
      "src/application/rules.ts:23:schema-record-interface:InputSchema",
      "src/application/rules.ts:24:schema-optional-key:email",
      "src/application/rules.ts:27:schema-error-class:AppError",
      "src/application/rules.ts:35:config-secret-redaction:API_TOKEN",
      "src/application/rules.ts:42:effect-fn-name:(anonymous)",
      "src/application/rules.ts:42:service-method-effect-fn:unnamed",
      "src/application/rules.ts:46:effect-fn-name:UserService",
      "src/application/rules.ts:50:process-environment:process.env",
      "src/application/rules.ts:58:service-method-effect-fn:saveUser",
      "src/application/rules.ts:59:service-method-effect-fn:silentWorker",
      "src/application/rules.ts:5:typescript-namespaces:Legacy",
      "src/application/rules.ts:60:layer-forever-acquisition:Layer.effect",
      "src/application/rules.ts:70:service-method-effect-fn:workQueue",
      "src/application/rules.ts:73:service-method-effect-fn:worker",
      "src/application/rules.ts:75:production-sleep-loops:Effect.sleep",
      "src/application/rules.ts:79:service-method-effect-fn:collect",
      "src/application/rules.ts:79:unbounded-stream-collect:Stream.runCollect",
      'src/application/rules.ts:80:unbounded-stream-buffer:Stream.buffer({ capacity: "unbounded" })',
      "src/application/rules.ts:84:handrolled-ttl-cache:Map",
      "src/application/rules.ts:93:handrolled-ttl-cache:Map",
      "src/application/rules.ts:99:handrolled-ttl-cache:Map",
      "src/application/rules.ts:99:inflight-dedupe-map:Map",
      "src/application/rules.ts:99:inflight-dedupe-map:Map",
      "src/application/rules.ts:9:unsafe-casts:as any",
      "tests/effect.spec.ts:4:global-config-mutation:process.env",
      "tests/effect.spec.ts:6:effect-test-style:it",
      "tests/effect.spec.ts:6:test-sleeps:Effect.sleep",
      "tests/effect.spec.ts:8:effect-test-style:it"
    ].sort()
  )
  assert.equal(
    rules.detections.some((detection) => detection.location.path.includes("application/allowed")),
    false
  )
  assert.equal(
    rules.detections.some((detection) => detection.location.path.includes("tests/allowed")),
    false
  )
  assert.equal(
    actual.some(
      (summary) =>
        summary.includes("adapters/allowed.ts") && summary.includes("raw-fetch-abort-signal")
    ),
    false
  )
})

test("Effect-quality wiring derives exact advice from the characterized Signal batch", async () => {
  const signals = await runSignals()
  const evidence = signals.find((candidate) => candidate.name === "effect-quality-advice-evidence")
  assert.ok(evidence)
  const evidenceSummary = (detection: Detection) => {
    assert.ok(Schema.is(EffectQualityAdviceData)(detection.data))
    return `${detection.location.path}:${detection.location.line}:${detection.data.kind}:${detection.data.subject}`
  }
  const actualEvidence = evidence.detections.map(evidenceSummary).sort()

  assert.deepEqual(
    actualEvidence,
    [
      "src/adapters/allowed.ts:4:http-client-preference:fetch",
      "src/adapters/http.ts:4:http-client-preference:fetch",
      "src/application/rules.ts:113:retry-without-jitter:effect:Effect.retry",
      "src/application/rules.ts:119:typed-boundary-error:effect:Effect.catchAll",
      'src/application/rules.ts:31:config-refined-values:Config.string("APP_PORT")',
      'src/application/rules.ts:32:layer-authority-visibility:Context.Reference("API_TOKEN")',
      "src/application/rules.ts:51:raw-fetch-outside-adapter:fetch",
      "src/application/rules.ts:52:boundary-schema-decode:JSON.parse",
      "src/application/rules.ts:53:thin-http-handlers:database.query",
      "src/application/rules.ts:54:layer-composition:effect:Layer.mergeAll",
      "src/application/rules.ts:55:raw-fetch-outside-adapter:fetch",
      "src/application/rules.ts:55:thin-http-handlers:fetch",
      "src/application/rules.ts:55:transaction-network-work:fetch",
      "src/application/rules.ts:57:scoped-background-work:effect:Effect.forkDaemon",
      "src/application/rules.ts:58:idempotent-retry:effect:Effect.retry (saveUser)",
      "src/application/rules.ts:59:observable-worker-failure:effect:Effect.ignore",
      "src/application/rules.ts:64:stream-pagination:page-token loop",
      "src/application/rules.ts:70:public-queue:effect:Queue.unbounded",
      "src/application/rules.ts:70:public-queue:effect:Queue.unbounded",
      "src/application/rules.ts:70:public-queue:effect:Queue.unbounded",
      "src/application/rules.ts:93:cache-preference:new Map (cache)",
      "src/application/rules.ts:99:keyed-stream-work:new Map (inflight)",
      "tests/effect.spec.ts:6:test-clock-for-time:effect:Effect.sleep",
      "tests/effect.spec.ts:9:test-live-runtime:it.live"
    ].sort()
  )

  const advice = effectQualityWiring.derive(signals)
  const actualAdvice = advice
    .map(
      (item) =>
        `${item.location.path}:${item.location.line}:${item.title}:${item.evidence[0]?.measure ?? ""}`
    )
    .sort()

  assert.deepEqual(
    actualAdvice,
    [
      "src/adapters/allowed.ts:4:prefer Effect HttpClient in adapters:fetch",
      "src/adapters/http.ts:4:prefer Effect HttpClient in adapters:fetch",
      "src/application/rules.ts:113:jitter exponential retry:effect:Effect.retry",
      "src/application/rules.ts:119:map boundary failures to typed domain errors:effect:Effect.catchAll",
      'src/application/rules.ts:31:refine configuration values:Config.string("APP_PORT")',
      'src/application/rules.ts:32:make layer authority explicit:Context.Reference("API_TOKEN")',
      "src/application/rules.ts:51:keep raw fetch in an adapter:fetch",
      "src/application/rules.ts:52:decode unknown boundary data:JSON.parse",
      "src/application/rules.ts:53:keep HTTP handlers thin:database.query",
      "src/application/rules.ts:54:make layer composition intentional:effect:Layer.mergeAll",
      "src/application/rules.ts:55:keep HTTP handlers thin:fetch",
      "src/application/rules.ts:55:keep network work outside transactions:fetch",
      "src/application/rules.ts:55:keep raw fetch in an adapter:fetch",
      "src/application/rules.ts:57:scope background work:effect:Effect.forkDaemon",
      "src/application/rules.ts:58:retry only idempotent operations:effect:Effect.retry (saveUser)",
      "src/application/rules.ts:59:make worker failures observable:effect:Effect.ignore",
      "src/application/rules.ts:64:prefer Stream.paginate:page-token loop",
      "src/application/rules.ts:70:expose streams instead of queues:effect:Queue.unbounded",
      "src/application/rules.ts:70:expose streams instead of queues:effect:Queue.unbounded",
      "src/application/rules.ts:70:expose streams instead of queues:effect:Queue.unbounded",
      "src/application/rules.ts:93:prefer Effect Cache:new Map (cache)",
      "src/application/rules.ts:99:centralize keyed stream work:new Map (inflight)",
      "tests/effect.spec.ts:6:use TestClock for time-sensitive tests:effect:Effect.sleep",
      "tests/effect.spec.ts:9:justify a live Effect test:it.live"
    ].sort()
  )
})
