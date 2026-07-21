import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Array, Effect, Schema } from "effect"
import { Signal } from "@better-typescript/core/engine/signal/data"
import {
  EffectQualityAdviceData,
  EffectQualityRuleData,
  type EffectQualityAdviceKind,
  type EffectQualityRuleKind
} from "@better-typescript/matchers/builtins/effectQuality/data"
import { effectQualityWiring } from "@better-typescript/guidance/preset/effectQualityWiring"
import { loadProject, runPolicyOnProject } from "@better-typescript/core/project/loadProject"
import { isProgramPolicy } from "@better-typescript/core/engine/wiring/data"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "effect-quality")

const runSignals = async (): Promise<ReadonlyArray<Signal>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return Promise.all(
    effectQualityWiring.policies.filter(isProgramPolicy).map(async (named) => {
      const detections = await Promise.all(
        workspace.projects.map((project) =>
          Effect.runPromise(runPolicyOnProject(Array.of(named))(project))
        )
      )

      return new Signal({
        name: named.name,
        reported: named.reported,
        detections: detections.flat(),
        examples: named.examples
      })
    })
  )
}

const ruleKinds = (signals: ReadonlyArray<Signal>): ReadonlySet<EffectQualityRuleKind> =>
  new Set(
    signals
      .filter((signal) => signal.reported)
      .flatMap((signal) => signal.detections)
      .flatMap((detection) =>
        Schema.is(EffectQualityRuleData)(detection.data) ? [detection.data.kind] : []
      )
  )

const adviceKinds = (signals: ReadonlyArray<Signal>): ReadonlySet<EffectQualityAdviceKind> =>
  new Set(
    signals
      .filter((signal) => !signal.reported)
      .flatMap((signal) => signal.detections)
      .flatMap((detection) =>
        Schema.is(EffectQualityAdviceData)(detection.data) ? [detection.data.kind] : []
      )
  )

test("Effect-quality wiring reports every supported local rule", async () => {
  const actual = ruleKinds(await runSignals())
  const expected: ReadonlyArray<EffectQualityRuleKind> = [
    "unsafe-casts",
    "schema-class-models",
    "typescript-namespaces",
    "process-environment",
    "test-sleeps",
    "production-sleep-loops",
    "unbounded-stream-collect",
    "unbounded-stream-buffer",
    "handrolled-ttl-cache",
    "inflight-dedupe-map",
    "cache-per-request",
    "scoped-client-cache",
    "raw-fetch-abort-signal",
    "typed-error-recovery",
    "layer-forever-acquisition",
    "global-config-mutation",
    "service-method-effect-fn",
    "effect-fn-name",
    "schema-record-interface",
    "schema-optional-key",
    "schema-error-class",
    "config-secret-redaction",
    "bounded-retry-schedule",
    "http-response-validation",
    "http-status-decode-order",
    "effect-test-style"
  ]

  for (const kind of expected) assert.equal(actual.has(kind), true, kind)
})

test("Effect-quality wiring derives every documented architecture advice kind", async () => {
  const signals = await runSignals()
  const actual = adviceKinds(signals)
  const advice = effectQualityWiring.derive(signals)
  const expected: ReadonlyArray<EffectQualityAdviceKind> = [
    "config-refined-values",
    "retry-without-jitter",
    "raw-fetch-outside-adapter",
    "test-live-runtime",
    "test-clock-for-time",
    "thin-http-handlers",
    "transaction-network-work",
    "layer-authority-visibility",
    "layer-composition",
    "scoped-background-work",
    "cache-preference",
    "stream-pagination",
    "public-queue",
    "keyed-stream-work",
    "typed-boundary-error",
    "boundary-schema-decode",
    "idempotent-retry",
    "observable-worker-failure",
    "http-client-preference"
  ]

  for (const kind of expected) assert.equal(actual.has(kind), true, kind)
  assert.equal(advice.length >= expected.length, true)
})
