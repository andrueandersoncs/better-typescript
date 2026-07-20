import { Array, Effect, Option, Result, Schema, Struct, pipe } from "effect"
import { makeEvidenceItem } from "@better-typescript/core/engine/derive"
import { Advice } from "@better-typescript/core/engine/derive/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { packageExamples } from "../../defineCheck.js"
import { EffectQualityAdviceData, type EffectQualityAdviceKind } from "./data.js"
import { effectQualityAdviceCheckName } from "./names.js"

const titles: Readonly<Record<EffectQualityAdviceKind, string>> = {
  "config-refined-values": "refine configuration values",
  "retry-without-jitter": "jitter exponential retry",
  "raw-fetch-outside-adapter": "keep raw fetch in an adapter",
  "test-live-runtime": "justify a live Effect test",
  "test-clock-for-time": "use TestClock for time-sensitive tests",
  "thin-http-handlers": "keep HTTP handlers thin",
  "transaction-network-work": "keep network work outside transactions",
  "layer-authority-visibility": "make layer authority explicit",
  "layer-composition": "make layer composition intentional",
  "scoped-background-work": "scope background work",
  "cache-preference": "prefer Effect Cache",
  "stream-pagination": "prefer Stream.paginate",
  "public-queue": "expose streams instead of queues",
  "keyed-stream-work": "centralize keyed stream work",
  "typed-boundary-error": "map boundary failures to typed domain errors",
  "boundary-schema-decode": "decode unknown boundary data",
  "idempotent-retry": "retry only idempotent operations",
  "observable-worker-failure": "make worker failures observable",
  "http-client-preference": "prefer Effect HttpClient in adapters"
}

const remediations: Readonly<Record<EffectQualityAdviceKind, string>> = {
  "config-refined-values":
    "Use Config.schema or Config.mapOrFail for path, URL, port, and identifier values.",
  "retry-without-jitter": "Add Schedule.jittered to the bounded backoff schedule.",
  "raw-fetch-outside-adapter":
    "Move raw fetch behind a named adapter boundary or use Effect HttpClient.",
  "test-live-runtime":
    "Prefer it.effect unless this test intentionally proves live runtime behavior.",
  "test-clock-for-time": "Fork time-dependent work, then advance TestClock instead of real time.",
  "thin-http-handlers":
    "Decode input, call a service, and map typed failures to transport responses.",
  "transaction-network-work":
    "Complete provider and network calls before entering the authoritative transaction.",
  "layer-authority-visibility":
    "Do not hide credentials, persistence, or transports behind a default Context.Reference.",
  "layer-composition": "Name the layer subgraph and make its exposed dependencies intentional.",
  "scoped-background-work": "Own worker lifetime in a Layer and fork it into that scope.",
  "cache-preference": "Use Cache.make or Cache.makeWith when its lifecycle semantics fit.",
  "stream-pagination": "Use Stream.paginate for an effectful token-based page source.",
  "public-queue":
    "Keep Queue, PubSub, and SubscriptionRef implementation-private; publish Stream values.",
  "keyed-stream-work":
    "Use a named FiberMap-based helper so per-key serialization is explicit and reusable.",
  "typed-boundary-error":
    "Translate infrastructure failures at the adapter seam into an operation-labelled domain error.",
  "boundary-schema-decode":
    "Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value.",
  "idempotent-retry":
    "Retry only operations whose idempotency is established by the domain contract.",
  "observable-worker-failure":
    "Log expected item failures or make the skip policy explicit at the owning worker boundary.",
  "http-client-preference":
    "Prefer Effect's typed HTTP client unless a documented raw-fetch exception applies."
}

const evidenceDetections = (signals: ReadonlyArray<Signal>): ReadonlyArray<Detection> =>
  pipe(
    Array.findFirst(signals, (signal) => signal.name === effectQualityAdviceCheckName),
    Option.map(Struct.get("detections")),
    Option.getOrElse(Array.empty<Detection>)
  )

export const effectQualityDerive = Effect.fn("EffectQuality.derive")(function* (
  signals: ReadonlyArray<Signal>
): Effect.fn.Return<ReadonlyArray<Advice>> {
  return pipe(
    evidenceDetections(signals),
    Array.filterMap((detection) => {
      if (!Schema.is(EffectQualityAdviceData)(detection.data)) {
        return Result.failVoid
      }

      const data = detection.data
      const evidenceItem = makeEvidenceItem(data.subject, 1)
      const evidence = Array.of(evidenceItem)
      const examples = packageExamples("effect-quality")

      const advice = Advice.make({
        location: detection.location,
        level: "file",
        title: titles[data.kind],
        remediation: remediations[data.kind],
        evidence,
        examples
      })

      return Result.succeed(advice)
    })
  )
})
