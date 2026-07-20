import { Array, Effect, Struct } from "effect"
import { ImperativeStateManagerInput } from "../checks/imperativeStateManager/data.js"
import { imperativeStateManager } from "../checks/imperativeStateManager/imperativeStateManager.js"
import { PipelineHostileInput } from "../checks/pipelineHostile/data.js"
import { pipelineHostile } from "../checks/pipelineHostile/pipelineHostile.js"
import { conceptProliferation } from "../checks/conceptControl/conceptProliferation.js"
import { sideEffectLaundering } from "../checks/sideEffectLaundering.js"
import { signalOf } from "@better-typescript/core/engine/signal"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { makeNamedDetection } from "@better-typescript/core/engine/derive"
import type { Advice, NamedDetection } from "@better-typescript/core/engine/derive/data"

const nameReportedDetections = (signal: Signal) =>
  Array.map(signal.detections, makeNamedDetection(signal.name))

export const defaultNamedElements = (
  signals: ReadonlyArray<Signal>
): ReadonlyArray<NamedDetection> => {
  const reportedSignals = Array.filter(signals, Struct.get("reported"))

  return Array.flatMap(reportedSignals, nameReportedDetections)
}

const materializeSpecificAdvice = Effect.fn("DefaultSpecificAdvice.materialize")(function* (
  imperativeInput: ImperativeStateManagerInput,
  pipelineInput: PipelineHostileInput,
  namedElements: ReadonlyArray<NamedDetection>,
  conceptSignals: ReadonlyArray<Signal["detections"][number]>
): Effect.fn.Return<ReadonlyArray<Advice>> {
  const imperativeAdvice = yield* imperativeStateManager(imperativeInput)
  const sideEffectAdvice = yield* sideEffectLaundering(namedElements)
  const pipelineAdvice = yield* pipelineHostile(pipelineInput)
  const conceptAdvice = yield* conceptProliferation(conceptSignals)
  const adviceGroups = Array.make(imperativeAdvice, sideEffectAdvice, pipelineAdvice, conceptAdvice)

  return Array.flatten(adviceGroups)
})

export const defaultSpecificAdvice = Effect.fn("DefaultSpecificAdvice.derive")(function* (
  signals: ReadonlyArray<Signal>
): Effect.fn.Return<ReadonlyArray<Advice>> {
  const elementsOf = signalOf(signals)
  const namedElements = defaultNamedElements(signals)
  const noMutation = elementsOf("no-mutation")
  const preferHashMap = elementsOf("prefer-hash-map")
  const preferHashSet = elementsOf("prefer-hash-set")
  const noMutableArrayMethods = elementsOf("no-mutable-array-methods")
  const noMutableVariableDeclarations = elementsOf("no-mutable-variable-declarations")
  const noNestedCalls = elementsOf("no-nested-calls")
  const preferCurried = elementsOf("prefer-curried-data-last-functions")
  const conceptSignals = elementsOf("concept-control")

  const imperativeInput = new ImperativeStateManagerInput({
    noMutation,
    preferHashMap,
    preferHashSet,
    noMutableArrayMethods,
    noMutableVariableDeclarations
  })

  const pipelineInput = new PipelineHostileInput({
    noNestedCalls,
    preferCurriedDataLastFunctions: preferCurried
  })

  return yield* materializeSpecificAdvice(
    imperativeInput,
    pipelineInput,
    namedElements,
    conceptSignals
  )
})
