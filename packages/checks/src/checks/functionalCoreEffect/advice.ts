import {
  Array,
  Data,
  Option,
  Record,
  Schema,
  Stream,
  Struct,
  Tuple,
  pipe
} from "effect"
import {
  adviceLocation,
  evidenceItem
} from "@better-typescript/core/engine/derive"
import { Advice } from "@better-typescript/core/engine/derive/data"
import type { EvidenceItem } from "@better-typescript/core/engine/derive/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { Signal } from "@better-typescript/core/engine/report/data"
import {
  FunctionalCoreBoundaryData,
  FunctionalCoreShapeData,
  type FunctionalCoreBoundaryKind,
  type FunctionalCoreShapeKind
} from "./data.js"
import {
  functionalCoreBoundaryCheckName,
  functionalCoreShapeCheckName
} from "./names.js"

class ShapeAdviceCopy extends Data.Class<{
  readonly title: string
  readonly remediation: string
}> {}

const shapeAdviceCopy: Readonly<
  Record<FunctionalCoreShapeKind, ShapeAdviceCopy>
> = {
  "effect-orchestrator": new ShapeAdviceCopy({
    title: "overgrown Effect orchestrator",
    remediation:
      "This application program both coordinates capabilities and owns domain decisions. Read through ports, call a pure function over plain data, then execute the returned decisions through ports. Keep retry, concurrency, resource, and typed-error control flow in Effect."
  }),
  "adapter-business-logic": new ShapeAdviceCopy({
    title: "business logic in an adapter",
    remediation:
      "This adapter contains a cluster of policy branches. Keep translation and foreign-effect handling here, but move business decisions into a pure domain function whose result the adapter or application program can execute."
  }),
  "thick-composition-root": new ShapeAdviceCopy({
    title: "thick composition root",
    remediation:
      "Keep this Module to Layer construction, provisioning, entry-program selection, and one runtime handoff. Move reusable functions and policy branches inward."
  }),
  "pure-service": new ShapeAdviceCopy({
    title: "pure service candidate",
    remediation:
      "This service surface contains only plain deterministic functions. Prefer an ordinary pure function or explicit function parameter unless multiple real adapters prove that this seam varies."
  })
}

const detectionsOf = (
  signals: ReadonlyArray<Signal>,
  name: string
): ReadonlyArray<Detection> =>
  pipe(
    Array.findFirst(signals, (signal) => signal.name === name),
    Option.map(Struct.get("detections")),
    Option.getOrElse(Array.empty<Detection>)
  )

const shapeEvidence = (
  data: FunctionalCoreShapeData
): ReadonlyArray<EvidenceItem> => {
  const measurements = Array.make(
    Tuple.make("branches", data.branchCount),
    Tuple.make("functions", data.functionCount),
    Tuple.make("services", data.serviceCount),
    Tuple.make("effectful-members", data.effectfulMemberCount),
    Tuple.make("transformations", data.transformationCount)
  )

  return pipe(
    measurements,
    Array.filter((entry) => entry[1] > 0),
    Array.map(([measure, count]) => evidenceItem(measure, count))
  )
}

const shapeAdvice = (
  detections: ReadonlyArray<Detection>
): ReadonlyArray<Advice> =>
  Array.filterMap(detections, (element) => {
    const data = element.data

    if (!Schema.is(FunctionalCoreShapeData)(data)) {
      return Option.none()
    }

    const copy = shapeAdviceCopy[data.kind]

    return Option.some(
      new Advice({
        location: element.location,
        level: "file",
        title: copy.title,
        remediation: copy.remediation,
        evidence: shapeEvidence(data)
      })
    )
  })

const boundaryPairs = (
  detections: ReadonlyArray<Detection>
): ReadonlyArray<readonly [Detection, FunctionalCoreBoundaryData]> =>
  Array.filterMap(detections, (element) =>
    Schema.is(FunctionalCoreBoundaryData)(element.data)
      ? Option.some(Tuple.make(element, element.data))
      : Option.none()
  )

const countKind = (
  elements: ReadonlyArray<readonly [Detection, FunctionalCoreBoundaryData]>,
  kind: FunctionalCoreBoundaryKind
): number => Array.filter(elements, ([, data]) => data.kind === kind).length

const imperativeCoreAdvice = (
  detections: ReadonlyArray<Detection>
): ReadonlyArray<Advice> => {
  const relevant = pipe(
    boundaryPairs(detections),
    Array.filter(
      ([, data]) => data.role === "domain" || data.role === "application"
    )
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

      const evidence = Array.map(kinds, (kind) =>
        evidenceItem(kind, countKind(elements, kind))
      )

      return Array.of(
        new Advice({
          location: adviceLocation(path),
          level: "file",
          title: "imperative core",
          remediation:
            "Several independent boundary violations concentrate in this core Module. Extract a pure decision function, express external needs as domain-owned Context.Tag ports, and leave Layer selection plus runtime execution at the composition root.",
          evidence
        })
      )
    })
  )
}

export const functionalCoreEffectDerive = (
  signals: ReadonlyArray<Signal>
): Stream.Stream<Advice, Error> => {
  const boundaryDetections = detectionsOf(
    signals,
    functionalCoreBoundaryCheckName
  )
  const shapeDetections = detectionsOf(signals, functionalCoreShapeCheckName)
  const localShapeAdvice = shapeAdvice(shapeDetections)
  const aggregateAdvice = imperativeCoreAdvice(boundaryDetections)

  return pipe(
    Array.appendAll(localShapeAdvice, aggregateAdvice),
    Stream.fromIterable
  )
}
