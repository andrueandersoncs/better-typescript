import { Array, Effect, Stream, Struct, pipe } from "effect"
import { highSignalDensity } from "../checks/highSignalDensity.js"
import { hotSubsystem } from "../checks/hotSubsystem/hotSubsystem.js"
import { imperativeStateManager } from "../checks/imperativeStateManager/imperativeStateManager.js"
import { pipelineHostile } from "../checks/pipelineHostile/pipelineHostile.js"
import { conceptProliferation } from "../checks/conceptControl/conceptProliferation.js"
import { ruleDominance } from "../checks/ruleDominance.js"
import { sideEffectLaundering } from "../checks/sideEffectLaundering.js"
import { systemicHotspots } from "../checks/systemicHotspots/systemicHotspots.js"
import { filterFallbackAdviceForUncoveredFiles } from "@better-typescript/core/engine/report"
import { signalOf } from "@better-typescript/core/engine/signal"
import { collectSignals } from "@better-typescript/core/engine/derive"
import { makeNamedDetection } from "@better-typescript/core/engine/derive"
import type { Signal } from "@better-typescript/core/engine/signal/data"

// Advice stream types stay inferred because a fifteenth import would re-fire the ceremony adviser.
const nameDetections = (signal: Signal) =>
  Array.map(signal.detections, makeNamedDetection(signal.name))

const replayAdvice = Stream.fromIterable

export const defaultDerive = (signals: ReadonlyArray<Signal>) => {
  const elementsOf = signalOf(signals)
  const reportedSignals = Array.filter(signals, Struct.get("reported"))
  const namedElementsSource = Array.flatMap(reportedSignals, nameDetections)
  const namedElements = Stream.fromIterable(namedElementsSource)
  const noMutation = elementsOf("no-mutation")
  const preferHashMap = elementsOf("prefer-hash-map")
  const preferHashSet = elementsOf("prefer-hash-set")
  const noMutableArrayMethods = elementsOf("no-mutable-array-methods")
  const noMutableVariableDeclarations = elementsOf("no-mutable-variable-declarations")
  const noNestedCalls = elementsOf("no-nested-calls")
  const preferCurried = elementsOf("prefer-curried-data-last-functions")
  const conceptSignals = elementsOf("concept-control")

  const imperativeAdvice = imperativeStateManager({
    noMutation,
    preferHashMap,
    preferHashSet,
    noMutableArrayMethods,
    noMutableVariableDeclarations
  })

  const launderingAdvice = sideEffectLaundering(namedElements)
  const conceptAdvice = conceptProliferation(conceptSignals)

  const pipelineAdvice = pipelineHostile({
    noNestedCalls,
    preferCurriedDataLastFunctions: preferCurried
  })

  const specificAdviceStreamsSource = Array.make(
    imperativeAdvice,
    launderingAdvice,
    pipelineAdvice,
    conceptAdvice
  )

  const specificAdviceStreams = Stream.fromIterable(specificAdviceStreamsSource)
  const specificAdvice = pipe(specificAdviceStreams, Stream.flatten())
  const densityAdvice = highSignalDensity(namedElements)
  const subsystemAdvice = hotSubsystem(namedElements)
  const dominanceAdvice = ruleDominance(namedElements)

  const materializedAdvice = Effect.gen(function* () {
    const specificItems = yield* collectSignals(specificAdvice)

    const densityAfterFallbackSuppression =
      filterFallbackAdviceForUncoveredFiles(specificItems)(densityAdvice)

    const densityItems = yield* collectSignals(densityAfterFallbackSuppression)
    const subsystemItems = yield* collectSignals(subsystemAdvice)
    const dominanceItems = yield* collectSignals(dominanceAdvice)
    const specificReplay = replayAdvice(specificItems)
    const densityReplay = replayAdvice(densityItems)
    const subsystemReplay = replayAdvice(subsystemItems)
    const dominanceReplay = replayAdvice(dominanceItems)

    const systemicInput = {
      hotSubsystem: subsystemReplay,
      highSignalDensity: densityReplay
    }

    const systemicAdvice = systemicHotspots(systemicInput)

    const outputAdviceStreamsSource = Array.make(
      specificReplay,
      densityReplay,
      subsystemReplay,
      dominanceReplay,
      systemicAdvice
    )

    const outputAdviceStreams = Stream.fromIterable(outputAdviceStreamsSource)

    return pipe(outputAdviceStreams, Stream.flatten())
  })

  return pipe(materializedAdvice, Stream.unwrap)
}
