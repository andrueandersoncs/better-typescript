import { Array, Effect, Option, Record, Result, Schema, Struct, Tuple, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence/strictEqual"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { type RefactorExampleSource } from "@better-typescript/core/engine/example/refactorExampleSource"
import { makePackageExamples } from "../makePackageExamples.js"
import { FunctionalCoreBoundaryData } from "@better-typescript/matchers/builtins/functionalCoreEffect/boundaryData"
import { FunctionalCoreShapeData } from "@better-typescript/matchers/builtins/functionalCoreEffect/shapeData"
import { type FunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyClass"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { defaultFunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyDefaults"
import { makeFunctionalCoreEffectBoundaries } from "../policies/functionalCoreEffectBoundaries.js"
import { makeFunctionalCoreShapeEvidencePolicy } from "../policies/functionalCoreShapeEvidence.js"

// Bound once because matcher check names must stay aligned with policy registration.
const functionalCoreBoundaryCheckName = "functional-core-effect-boundaries"
const functionalCoreShapeCheckName = "functional-core-effect-shape-evidence"

type FunctionalCoreShapeKind = FunctionalCoreShapeData["kind"]

const shapeAdviceTitles: Readonly<Record<FunctionalCoreShapeKind, string>> = {
  "effect-orchestrator": "overgrown Effect orchestrator",
  "adapter-business-logic": "business logic in an adapter",
  "thick-composition-root": "thick composition root",
  "pure-service": "pure service candidate"
}

const shapeAdviceExamples: Readonly<Record<FunctionalCoreShapeKind, RefactorExampleSource>> = {
  "effect-orchestrator": makePackageExamples("effect-orchestrator"),
  "adapter-business-logic": makePackageExamples("adapter-business-logic"),
  "thick-composition-root": makePackageExamples("thick-composition-root"),
  "pure-service": makePackageExamples("pure-service")
}

export const imperativeCoreExamples = makePackageExamples("imperative-core")

const shapeAdviceRemediations: Readonly<Record<FunctionalCoreShapeKind, string>> = {
  "effect-orchestrator":
    "This application program both coordinates capabilities and owns domain decisions. Read through ports, call a pure function over plain data, then execute the returned decisions through ports. Keep retry, concurrency, resource, and typed-error control flow in Effect.",
  "adapter-business-logic":
    "This adapter contains a cluster of policy branches. Keep translation and foreign-effect handling here, but move business decisions into a pure domain function whose result the adapter or application program can execute.",
  "thick-composition-root":
    "Keep this Module to Layer construction, provisioning, entry-program selection, and one runtime handoff. Move reusable functions and policy branches inward.",
  "pure-service":
    "This service surface contains only plain deterministic functions. Prefer an ordinary pure function or explicit function parameter unless multiple real adapters prove that this seam varies."
}

const detectionsOf = (signals: ReadonlyArray<Signal>, name: string): ReadonlyArray<Detection> => {
  const signalNamed = flow(Struct.get<Signal, "name">("name"), strictEqual(name))

  return pipe(
    Array.findFirst(signals, signalNamed),
    Option.map(Struct.get("detections")),
    Option.getOrElse(Array.empty<Detection>)
  )
}

const measurementHasCount = (entry: readonly [string, number]) => {
  const count = Tuple.get(entry, 1)

  return count > 0
}

const shapeEvidence = (data: FunctionalCoreShapeData): ReadonlyArray<EvidenceItem> => {
  const branches = Tuple.make("branches", data.branchCount)
  const functions = Tuple.make("functions", data.functionCount)
  const services = Tuple.make("services", data.serviceCount)
  const effectfulMembers = Tuple.make("effectful-members", data.effectfulMemberCount)
  const transformations = Tuple.make("transformations", data.transformationCount)
  const measurements = Array.make(branches, functions, services, effectfulMembers, transformations)

  return pipe(
    measurements,
    Array.filter(measurementHasCount),
    Array.map(([measure, count]) => EvidenceItem.make({ measure: measure, count: count }))
  )
}

const shapeAdvice = (detections: ReadonlyArray<Detection>): ReadonlyArray<Advice> =>
  Array.filterMap(detections, (element) => {
    if (!Schema.is(FunctionalCoreShapeData)(element.data)) {
      return Result.failVoid
    }

    const evidence = shapeEvidence(element.data)
    const examples = shapeAdviceExamples[element.data.kind]

    const advice = Advice.make({
      location: element.location,
      level: "file",
      title: shapeAdviceTitles[element.data.kind],
      remediation: shapeAdviceRemediations[element.data.kind],
      evidence,
      examples
    })

    return Result.succeed(advice)
  })

const boundaryPairs = (
  detections: ReadonlyArray<Detection>
): ReadonlyArray<readonly [Detection, FunctionalCoreBoundaryData]> =>
  Array.filterMap(detections, (element) => {
    const isBoundary = Schema.is(FunctionalCoreBoundaryData)(element.data)

    if (!isBoundary) {
      return Result.failVoid
    }

    const pair = Tuple.make(element, element.data)

    return Result.succeed(pair)
  })

const imperativeCoreAdvice = (detections: ReadonlyArray<Detection>): ReadonlyArray<Advice> => {
  const relevant = pipe(
    boundaryPairs(detections),
    Array.filter(([, data]) => {
      const isDomain = strictEqual("domain")(data.role)
      const isApplication = strictEqual("application")(data.role)

      return isDomain || isApplication
    })
  )

  const grouped = Array.groupBy(relevant, ([element]) => element.location.path)

  return pipe(
    Record.toEntries(grouped),
    Array.flatMap(([path, elements]) => {
      const kinds = pipe(
        elements,
        Array.map(([, data]) => data.kind),
        Array.dedupe
      )

      if (kinds.length < 2) {
        return Array.empty<Advice>()
      }

      const evidence = Array.map(kinds, (kind) => {
        const count = Array.countBy(elements, ([, data]) => strictEqual(kind)(data.kind))

        return EvidenceItem.make({ measure: kind, count: count })
      })

      const location = Location.make({ path: path })

      const advice = Advice.make({
        location,
        level: "file",
        title: "imperative core",
        remediation:
          "Several independent boundary violations concentrate in this core Module. Extract a pure decision function, express external needs as domain-owned Context.Service ports, and leave Layer selection plus runtime execution at the composition root.",
        evidence,
        examples: imperativeCoreExamples
      })

      return Array.of(advice)
    })
  )
}

export const functionalCoreEffectDerive = Effect.fn("FunctionalCoreEffect.derive")((
  signals: ReadonlyArray<Signal>
) => {
  const boundaryDetections = detectionsOf(signals, functionalCoreBoundaryCheckName)
  const shapeDetections = detectionsOf(signals, functionalCoreShapeCheckName)
  const localShapeAdvice = shapeAdvice(shapeDetections)
  const aggregateAdvice = imperativeCoreAdvice(boundaryDetections)
  const advice = Array.appendAll(localShapeAdvice, aggregateAdvice)

  return Effect.succeed(advice)
})

export const makeFunctionalCoreEffectWiring = (policy: FunctionalCoreEffectPolicy) => {
  const boundaries = makeFunctionalCoreEffectBoundaries(policy)
  const shapeEvidence = makeFunctionalCoreShapeEvidencePolicy(policy)
  const policies = Array.make(boundaries, shapeEvidence)

  return makeWiring({
    policies,
    derive: functionalCoreEffectDerive
  })
}

export const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(
  defaultFunctionalCoreEffectPolicy
)
