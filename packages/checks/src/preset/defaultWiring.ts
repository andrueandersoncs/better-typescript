import { Array, Effect, Stream, Struct, pipe } from "effect"
import { highSignalDensity } from "../checks/highSignalDensity.js"
import { hotSubsystem } from "../checks/hotSubsystem/hotSubsystem.js"
import { imperativeStateManager } from "../checks/imperativeStateManager/imperativeStateManager.js"
import { pipelineHostile } from "../checks/pipelineHostile/pipelineHostile.js"
import { conceptProliferation } from "../checks/conceptControl/conceptProliferation.js"
import { ruleDominance } from "../checks/ruleDominance.js"
import { sideEffectLaundering } from "../checks/sideEffectLaundering.js"
import { systemicHotspots } from "../checks/systemicHotspots/systemicHotspots.js"
import { preferEffectSchemaGuard } from "../checks/preferEffectSchemaGuard.js"
import { preferEffectSchemaIs } from "../checks/preferEffectSchemaIs.js"
import { preferEffectSchemaConstructor } from "../checks/preferEffectSchemaConstructor.js"
import { preferEffectSchemaClass } from "../checks/preferEffectSchemaClass.js"
import { preferEffectFn } from "../checks/preferEffectFn.js"
import { preferEffectFunctionConstant } from "../checks/preferEffectFunctionConstant.js"
import { preferEffectPropertyAccessors } from "../checks/preferEffectPropertyAccessors.js"
import { preferEffectRecordFilterMap } from "../checks/preferEffectRecordFilterMap.js"
import { preferEffectArray } from "../checks/preferEffectArray.js"
import { preferEffectArrayAppendAll } from "../checks/preferEffectArrayAppendAll.js"
import { preferSchemaTaggedClass } from "../checks/preferSchemaTaggedClass.js"
import { requireWireSafeSchemaTaggedClass } from "../checks/requireWireSafeSchemaTaggedClass.js"
import { conceptControl } from "../checks/conceptControl/conceptControl.js"
import { preferConditionalReturn } from "../checks/preferConditionalReturn.js"
import { preferDirectBooleanReturn } from "../checks/preferDirectBooleanReturn.js"
import { preferDirectYield } from "../checks/preferDirectYield.js"
import { preferFunctionComposition } from "../checks/preferFunctionComposition.js"
import { preferEtaReduction } from "../checks/preferEtaReduction.js"
import { preferFunctionFlip } from "../checks/preferFunctionFlip.js"
import { preferImplicitReturn } from "../checks/preferImplicitReturn.js"
import { noThrow } from "../checks/noThrow.js"
import { noNewError } from "../checks/noNewError.js"
import { noErrorType } from "../checks/noErrorType.js"
import { noTryCatch } from "../checks/noTryCatch.js"
import { noUndefined } from "../checks/noUndefined.js"
import { noUnused } from "../checks/noUnused.js"
import { noVoidFunctions } from "../checks/noVoidFunctions.js"
import { noMultiLineComments } from "../checks/noMultiLineComments.js"
import { requireBecauseInComments } from "../checks/requireBecauseInComments.js"
import { noLongComments } from "../checks/noLongComments.js"
import { requireBlankLinesAroundMultilineDeclarations } from "../checks/requireBlankLinesAroundMultilineDeclarations.js"
import { noBlankLinesBetweenSingleLineDeclarations } from "../checks/noBlankLinesBetweenSingleLineDeclarations.js"
import { noExplicitAnyReturn } from "../checks/noExplicitAnyReturn.js"
import { noMultipleBooleanOperators } from "../checks/noMultipleBooleanOperators.js"
import { noInlineBooleanExpressions } from "../checks/noInlineBooleanExpressions.js"
import { noMutableArrayMethods } from "../checks/noMutableArrayMethods.js"
import { noMutableVariableDeclarations } from "../checks/noMutableVariableDeclarations.js"
import { noMutation } from "../checks/noMutation.js"
import { noWeakMap } from "../checks/noWeakMap.js"
import { noNestedIfStatements } from "../checks/noNestedIfStatements.js"
import { noNonNullAssertion } from "../checks/noNonNullAssertion.js"
import { noDuplicateIfBodies } from "../checks/noDuplicateIfBodies.js"
import { noDuplicateFunctionNames } from "../checks/noDuplicateFunctionNames.js"
import { noCallbacks } from "../checks/noCallbacks.js"
import { noAsyncFunctions } from "../checks/noAsyncFunctions.js"
import { noArraySpread } from "../checks/noArraySpread.js"
import { noPrimitiveArrayConstructors } from "../checks/noPrimitiveArrayConstructors.js"
import { noForInLoops } from "../checks/noForInLoops.js"
import { noForLoops } from "../checks/noForLoops.js"
import { noForOfLoops } from "../checks/noForOfLoops.js"
import { noSwitchStatements } from "../checks/noSwitchStatements.js"
import { noFunctionKeyword } from "../checks/noFunctionKeyword.js"
import { noInlineClosures } from "../checks/noInlineClosures.js"
import { noNestedCalls } from "../checks/noNestedCalls.js"
import { noManualTypeDispatch } from "../checks/noManualTypeDispatch.js"
import { noMonomorphicStructGet } from "../checks/noMonomorphicStructGet.js"
import { noRawObjectTypes } from "../checks/noRawObjectTypes.js"
import { noFirstPartySchemaDeclare } from "../checks/noFirstPartySchemaDeclare.js"
import { noInstanceof } from "../checks/noInstanceof.js"
import { preferHashSet } from "../checks/preferHashSet.js"
import { preferHashMap } from "../checks/preferHashMap.js"
import { preferOptionMatch } from "../checks/preferOptionMatch.js"
import { preferPipeFunction } from "../checks/preferPipeFunction.js"
import { preferCurriedDataLastFunctions } from "../checks/preferCurriedDataLastFunctions/preferCurriedDataLastFunctions.js"
import { filterFallbackAdviceForUncoveredFiles } from "@better-typescript/core/engine/report"
import { defineConfig, makeWiring } from "@better-typescript/core/engine/wiring"
import { signalOf } from "@better-typescript/core/engine/signal"
import type { NamedCheck, Wiring, WiringConfig } from "@better-typescript/core/engine/wiring/data"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { collectSignals } from "@better-typescript/core/engine/derive"
import { namedDetection } from "@better-typescript/core/engine/location"
import type { Advice, NamedDetection } from "@better-typescript/core/engine/derive/data"

const nameDetections = (signal: Signal): Stream.Stream<NamedDetection> => {
  const toNamedDetection = namedDetection(signal.name)

  return pipe(Stream.fromIterable(signal.detections), Stream.map(toNamedDetection))
}

const replayAdvice = Stream.fromIterable

export const defaultChecks: ReadonlyArray<NamedCheck> = Array.make(
  preferEffectSchemaGuard,
  preferEffectSchemaIs,
  preferEffectSchemaConstructor,
  preferEffectSchemaClass,
  preferEffectFn,
  preferEffectFunctionConstant,
  preferEffectPropertyAccessors,
  preferEffectRecordFilterMap,
  preferEffectArray,
  preferEffectArrayAppendAll,
  preferSchemaTaggedClass,
  requireWireSafeSchemaTaggedClass,
  conceptControl,
  preferConditionalReturn,
  preferDirectBooleanReturn,
  preferDirectYield,
  preferFunctionComposition,
  preferEtaReduction,
  preferFunctionFlip,
  preferImplicitReturn,
  noThrow,
  noNewError,
  noErrorType,
  noTryCatch,
  noUndefined,
  noUnused,
  noVoidFunctions,
  noMultiLineComments,
  requireBecauseInComments,
  noLongComments,
  requireBlankLinesAroundMultilineDeclarations,
  noBlankLinesBetweenSingleLineDeclarations,
  noExplicitAnyReturn,
  noMultipleBooleanOperators,
  noInlineBooleanExpressions,
  noMutableArrayMethods,
  noMutableVariableDeclarations,
  noMutation,
  noWeakMap,
  noNestedIfStatements,
  noNonNullAssertion,
  noDuplicateIfBodies,
  noDuplicateFunctionNames,
  noCallbacks,
  noAsyncFunctions,
  noArraySpread,
  noPrimitiveArrayConstructors,
  noForInLoops,
  noForLoops,
  noForOfLoops,
  noSwitchStatements,
  noFunctionKeyword,
  noInlineClosures,
  noNestedCalls,
  noManualTypeDispatch,
  noMonomorphicStructGet,
  noRawObjectTypes,
  noFirstPartySchemaDeclare,
  noInstanceof,
  preferHashSet,
  preferHashMap,
  preferOptionMatch,
  preferPipeFunction,
  preferCurriedDataLastFunctions
)

export const defaultDerive = (signals: ReadonlyArray<Signal>): Stream.Stream<Advice> => {
  const elementsOf = signalOf(signals)
  const reportedSignals = Array.filter(signals, Struct.get("reported"))
  const signalStream = Stream.fromIterable(reportedSignals)
  const namedElements = pipe(signalStream, Stream.flatMap(nameDetections))
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

export const defaultWiring: Wiring = makeWiring({ checks: defaultChecks, derive: defaultDerive })

const defaultFiles = Array.of("**/*")

const defaultConfigEntries = Array.of({
  files: defaultFiles,
  wiring: defaultWiring
})

export const defaultConfig: WiringConfig = defineConfig(defaultConfigEntries)
