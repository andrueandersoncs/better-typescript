import { Array, Function, Option, Record, Result, Schema, Struct, Tuple, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { type RefactorExampleSource } from "@better-typescript/core/engine/example/refactorExampleSource"
import { makePackageExamples } from "../makePackageExamples.js"
import { type FunctionalCoreShapeKind } from "@better-typescript/matchers/builtins/functionalCoreEffect/shapeKind"
import { FunctionalCoreBoundaryData } from "@better-typescript/matchers/builtins/functionalCoreEffect/boundaryData"
import { FunctionalCoreShapeData } from "@better-typescript/matchers/builtins/functionalCoreEffect/shapeData"
import type { Match } from "@better-typescript/matchers/matcher/match"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { makeFunctionalCoreEffect } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffect"
import { type FunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyClass"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { makeFunctionalCoreShapeEvidence } from "@better-typescript/matchers/builtins/functionalCoreEffect/shapeEvidence"

import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { defaultFunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyDefaults"

// Bound once because matcher check names must stay aligned with policy registration.
const functionalCoreBoundaryCheckName = "functional-core-effect-boundaries"
const functionalCoreShapeCheckName = "functional-core-effect-shape-evidence"

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

export const functionalCoreEffectDerive = (
  signals: ReadonlyArray<Signal>
): ReadonlyArray<Advice> => {
  const boundaryDetections = detectionsOf(signals, functionalCoreBoundaryCheckName)
  const shapeDetections = detectionsOf(signals, functionalCoreShapeCheckName)
  const localShapeAdvice = shapeAdvice(shapeDetections)
  const aggregateAdvice = imperativeCoreAdvice(boundaryDetections)

  return Array.appendAll(localShapeAdvice, aggregateAdvice)
}

const messageByKind: Readonly<Record<FunctionalCoreBoundaryData["kind"], string>> = {
  "dependency-direction": "This dependency points outward across the functional-core architecture.",
  "domain-effect-program":
    "Keep the domain core pure instead of constructing an Effect program here.",
  "direct-capability": "Access concrete capabilities only through an adapter at a declared seam.",
  "runtime-execution": "Run Effect programs only at a configured composition root.",
  "dependency-provisioning": "Choose and provide live implementations only at a composition root.",
  "port-live-implementation":
    "A port declares an interface; its live implementation belongs in an adapter.",
  "infrastructure-contract":
    "Do not expose infrastructure or mutable runtime handles through a port contract.",
  "service-locator":
    "Require individual services through the Effect context channel instead of passing a context or runtime bag.",
  "unsuspended-adapter-effect":
    "Suspend the foreign operation before composing it into an Effect program.",
  "unscoped-resource": "Acquire this external resource in an Effect-managed lifecycle.",
  "escaping-runtime-state":
    "Create shared Effect state inside a Layer.effect service instead of letting it escape."
}

const hintByKind: Readonly<Record<FunctionalCoreBoundaryData["kind"], string>> = {
  "dependency-direction":
    "Move the dependency behind a domain-owned port, or move this behaviour to the outer role that owns the implementation.",
  "domain-effect-program":
    "Return an immutable domain decision from a plain function; let application code translate the decision into Effect operations.",
  "direct-capability":
    "Declare a Context.Service port with domain inputs and outputs, then implement it with a Layer in an adapter.",
  "runtime-execution":
    "Return the Effect value with its requirements visible; provide and run it once in main, bootstrap, wiring, or a test boundary.",
  "dependency-provisioning":
    "Leave the R channel open through application code and compose Layers where the application starts.",
  "port-live-implementation":
    "Use Context.Service for the port and export Layer.effect or Layer.succeed from an adapter Module.",
  "infrastructure-contract":
    "Expose domain-owned values, errors, Effect, or Stream; keep SDK clients, Promise, Runtime, Ref, Queue, and PubSub private to the adapter.",
  "service-locator":
    "Yield the precise Context.Service requirement where it is used; never pass Context.Context or a Runtime as a dependency bag.",
  "unsuspended-adapter-effect":
    "Use Effect.sync, Effect.try, Effect.tryPromise, or Effect.callback around the lazy foreign call; Effect.succeed does not suspend work.",
  "unscoped-resource":
    "Pair acquisition and release with Effect.acquireRelease or acquireDisposable, then expose the scoped implementation through a Layer.",
  "escaping-runtime-state":
    "Use Ref.make or the appropriate Queue/PubSub constructor while building a Layer.effect service and keep the handle out of the port surface."
}

const makeFceBoundariesFindings = (match: Match<FunctionalCoreBoundaryData>) =>
  makeFindings(
    match.target,
    messageByKind[match.fact.kind],
    hintByKind[match.fact.kind],
    match.fact
  )

const makeFceBoundariesPolicy = (policy: FunctionalCoreEffectPolicy) => {
  const matcher = makeFunctionalCoreEffect(policy)

  return makeBuiltinPolicy({
    name: "functional-core-effect-boundaries",
    matcher: matcher,
    guidance: Function.constant(makeFceBoundariesFindings),
    reported: true,
    stage: "program"
  })
}

const message = "Functional-core architecture shape evidence for derived advice."

const hint = "Use this silent signal only as input to functional-core advice derivation."

const makeFceShapeEvidenceFindings = (match: Match<FunctionalCoreShapeData>) =>
  makeFindings(match.target, message, hint, match.fact)

const makeFceShapeEvidencePolicy = (policy: FunctionalCoreEffectPolicy) => {
  const matcher = makeFunctionalCoreShapeEvidence(policy)

  return makeBuiltinPolicy({
    name: "functional-core-effect-shape-evidence",
    matcher: matcher,
    guidance: Function.constant(makeFceShapeEvidenceFindings),
    reported: false,
    stage: "program"
  })
}

export const makeFunctionalCoreEffectWiring = (policy: FunctionalCoreEffectPolicy) => {
  const boundaries = makeFceBoundariesPolicy(policy)
  const shapeEvidence = makeFceShapeEvidencePolicy(policy)
  const policies = Array.make(boundaries, shapeEvidence)

  return makeWiring({
    policies,
    derive: functionalCoreEffectDerive
  })
}

export const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(
  defaultFunctionalCoreEffectPolicy
)
