import { Array, Data, Stream, Struct, pipe } from "effect"
import { highSignalDensity } from "../checks/highSignalDensity.js"
import { hotSubsystem } from "../checks/hotSubsystem/hotSubsystem.js"
import { ImperativeStateManagerInput } from "../checks/imperativeStateManager/data.js"
import { imperativeStateManager } from "../checks/imperativeStateManager/imperativeStateManager.js"
import { PipelineHostileInput } from "../checks/pipelineHostile/data.js"
import { pipelineHostile } from "../checks/pipelineHostile/pipelineHostile.js"
import { conceptProliferation } from "../checks/conceptControl/conceptProliferation.js"
import { ruleDominance } from "../checks/ruleDominance.js"
import { sideEffectLaundering } from "../checks/sideEffectLaundering.js"
import { signalOf } from "@better-typescript/core/engine/signal"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { makeNamedDetection } from "@better-typescript/core/engine/derive"
import type { Advice, NamedDetection } from "@better-typescript/core/engine/derive/data"

const nameReportedDetections = (signal: Signal) =>
  Array.map(signal.detections, makeNamedDetection(signal.name))

export const defaultNamedElements = (
  signals: ReadonlyArray<Signal>
): Stream.Stream<NamedDetection> => {
  const reportedSignals = Array.filter(signals, Struct.get("reported"))
  const namedElementsSource = Array.flatMap(reportedSignals, nameReportedDetections)

  return Stream.fromIterable(namedElementsSource)
}

export const defaultSpecificAdvice = (signals: ReadonlyArray<Signal>): Stream.Stream<Advice> => {
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

  const imperativeAdvice = imperativeStateManager(imperativeInput)
  const launderingAdvice = sideEffectLaundering(namedElements)
  const conceptAdvice = conceptProliferation(conceptSignals)
  const pipelineAdvice = pipelineHostile(pipelineInput)

  const specificAdviceStreamsSource = Array.make(
    imperativeAdvice,
    launderingAdvice,
    pipelineAdvice,
    conceptAdvice
  )

  return pipe(Stream.fromIterable(specificAdviceStreamsSource), Stream.flatten())
}

// Density/subsystem/dominance batch because derive materializes one triple.
export class DefaultAggregateAdvice extends Data.Class<{
  readonly densityAdvice: Stream.Stream<Advice>
  readonly subsystemAdvice: Stream.Stream<Advice>
  readonly dominanceAdvice: Stream.Stream<Advice>
}> {}

export const makeDefaultAggregateAdvice = (namedElements: Stream.Stream<NamedDetection>) => {
  const densityAdvice = highSignalDensity(namedElements)
  const subsystemAdvice = hotSubsystem(namedElements)
  const dominanceAdvice = ruleDominance(namedElements)

  return new DefaultAggregateAdvice({
    densityAdvice,
    subsystemAdvice,
    dominanceAdvice
  })
}
