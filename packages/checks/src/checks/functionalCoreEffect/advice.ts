import { Array, Effect, Option, Record, Schema, Stream, Struct, Tuple, pipe, Result } from "effect"
import { adviceLocation, evidenceItem } from "@better-typescript/core/engine/derive"
import { Advice } from "@better-typescript/core/engine/derive/data"
import type { EvidenceItem } from "@better-typescript/core/engine/derive/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { packageExamples } from "../../defineCheck.js"
import {
  FunctionalCoreBoundaryData,
  FunctionalCoreShapeData,
  type FunctionalCoreBoundaryKind,
  type FunctionalCoreShapeKind
} from "./data.js"
import { functionalCoreBoundaryCheckName, functionalCoreShapeCheckName } from "./names.js"

const shapeAdviceTitles: Readonly<Record<FunctionalCoreShapeKind, string>> = {
  "effect-orchestrator": "overgrown Effect orchestrator",
  "adapter-business-logic": "business logic in an adapter",
  "thick-composition-root": "thick composition root",
  "pure-service": "pure service candidate"
}

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

const detectionsOf = (signals: ReadonlyArray<Signal>, name: string): ReadonlyArray<Detection> =>
  pipe(
    Array.findFirst(signals, (signal) => signal.name === name),
    Option.map(Struct.get("detections")),
    Option.getOrElse(Array.empty<Detection>)
  )

const shapeEvidence = (data: FunctionalCoreShapeData): ReadonlyArray<EvidenceItem> => {
  const branches = Tuple.make("branches", data.branchCount)
  const functions = Tuple.make("functions", data.functionCount)
  const services = Tuple.make("services", data.serviceCount)
  const effectfulMembers = Tuple.make("effectful-members", data.effectfulMemberCount)
  const transformations = Tuple.make("transformations", data.transformationCount)
  const measurements = Array.make(branches, functions, services, effectfulMembers, transformations)

  return pipe(
    measurements,
    Array.filter((entry) => entry[1] > 0),
    Array.map(([measure, count]) => evidenceItem(measure, count))
  )
}

const shapeAdvice =
  (shapeAdviceExamples: Readonly<Record<FunctionalCoreShapeKind, NonEmptyRefactorExamples>>) =>
  (detections: ReadonlyArray<Detection>): ReadonlyArray<Advice> =>
    Array.filterMap(detections, (element) => {
      const data = element.data

      if (!Schema.is(FunctionalCoreShapeData)(data)) {
        return Result.failVoid
      }

      const evidence = shapeEvidence(data)
      const examples = shapeAdviceExamples[data.kind]

      const advice = new Advice({
        location: element.location,
        level: "file",
        title: shapeAdviceTitles[data.kind],
        remediation: shapeAdviceRemediations[data.kind],
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

const countKind = (
  elements: ReadonlyArray<readonly [Detection, FunctionalCoreBoundaryData]>,
  kind: FunctionalCoreBoundaryKind
): number => Array.filter(elements, ([, data]) => data.kind === kind).length

const imperativeCoreAdvice =
  (imperativeCore: NonEmptyRefactorExamples) =>
  (detections: ReadonlyArray<Detection>): ReadonlyArray<Advice> => {
    const relevant = pipe(
      boundaryPairs(detections),
      Array.filter(([, data]) => {
        const isDomain = data.role === "domain"
        const isApplication = data.role === "application"

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
          const count = countKind(elements, kind)

          return evidenceItem(kind, count)
        })

        const location = adviceLocation(path)

        const advice = new Advice({
          location,
          level: "file",
          title: "imperative core",
          remediation:
            "Several independent boundary violations concentrate in this core Module. Extract a pure decision function, express external needs as domain-owned Context.Service ports, and leave Layer selection plus runtime execution at the composition root.",
          evidence,
          examples: imperativeCore
        })

        return Array.of(advice)
      })
    )
  }

export const functionalCoreEffectDerive = Effect.gen(function* () {
  const effectOrchestrator = yield* packageExamples("effect-orchestrator")
  const adapterBusinessLogic = yield* packageExamples("adapter-business-logic")
  const thickCompositionRoot = yield* packageExamples("thick-composition-root")
  const pureService = yield* packageExamples("pure-service")
  const imperativeCore = yield* packageExamples("imperative-core")

  const derive = (signals: ReadonlyArray<Signal>): Stream.Stream<Advice> => {
    const shapeAdviceExamples: Readonly<Record<FunctionalCoreShapeKind, NonEmptyRefactorExamples>> =
      {
        "effect-orchestrator": effectOrchestrator,
        "adapter-business-logic": adapterBusinessLogic,
        "thick-composition-root": thickCompositionRoot,
        "pure-service": pureService
      }

    const boundaryDetections = detectionsOf(signals, functionalCoreBoundaryCheckName)
    const shapeDetections = detectionsOf(signals, functionalCoreShapeCheckName)
    const localShapeAdvice = shapeAdvice(shapeAdviceExamples)(shapeDetections)
    const aggregateAdvice = imperativeCoreAdvice(imperativeCore)(boundaryDetections)

    return pipe(Array.appendAll(localShapeAdvice, aggregateAdvice), Stream.fromIterable)
  }

  return derive
})
