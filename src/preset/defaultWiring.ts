import { Array, Effect, Stream, Struct, pipe } from "effect"
import { highSignalDensity } from "../checks/highSignalDensity.js"
import { hotSubsystem } from "../checks/hotSubsystem.js"
import { imperativeStateManager } from "../checks/imperativeStateManager.js"
import { pipelineHostile } from "../checks/pipelineHostile.js"
import { ruleDominance } from "../checks/ruleDominance.js"
import { sideEffectLaundering } from "../checks/sideEffectLaundering.js"
import { systemicHotspots } from "../checks/systemicHotspots.js"
import { preferCurriedDataLastFunctions } from "../checks/preferCurriedDataLastFunctions.js"
import { noAbstractClasses } from "../checks/noAbstractClasses.js"
import { noArraySpread } from "../checks/noArraySpread.js"
import { noAsyncFunctions } from "../checks/noAsyncFunctions.js"
import { noCallbacks } from "../checks/noCallbacks.js"
import { noClassMethodImplementations } from "../checks/noClassMethodImplementations.js"
import { noDataTaggedClass } from "../checks/noDataTaggedClass.js"
import { noDuplicateFunctionNames } from "../checks/noDuplicateFunctionNames.js"
import { noDuplicateIfBodies } from "../checks/noDuplicateIfBodies.js"
import { noExplicitAnyReturn } from "../checks/noExplicitAnyReturn.js"
import { noFirstPartySchemaDeclare } from "../checks/noFirstPartySchemaDeclare.js"
import { noForInLoops } from "../checks/noForInLoops.js"
import { noForLoops } from "../checks/noForLoops.js"
import { noForOfLoops } from "../checks/noForOfLoops.js"
import { noFunctionKeyword } from "../checks/noFunctionKeyword.js"
import { noInlineBooleanExpressions } from "../checks/noInlineBooleanExpressions.js"
import { noInlineClosures } from "../checks/noInlineClosures.js"
import { noInstanceof } from "../checks/noInstanceof.js"
import { noManualTypeDispatch } from "../checks/noManualTypeDispatch.js"
import { noMonomorphicStructGet } from "../checks/noMonomorphicStructGet.js"
import { noMultiLineComments } from "../checks/noMultiLineComments.js"
import { noMultipleBooleanOperators } from "../checks/noMultipleBooleanOperators.js"
import { noMutableArrayMethods } from "../checks/noMutableArrayMethods.js"
import { noMutableVariableDeclarations } from "../checks/noMutableVariableDeclarations.js"
import { noMutation } from "../checks/noMutation.js"
import { noNestedCalls } from "../checks/noNestedCalls.js"
import { noNestedIfStatements } from "../checks/noNestedIfStatements.js"
import { noNewError } from "../checks/noNewError.js"
import { noNonNullAssertion } from "../checks/noNonNullAssertion.js"
import { noRawObjectTypes } from "../checks/noRawObjectTypes.js"
import { noReexport } from "../checks/noReexport.js"
import { noRootLevelClasses } from "../checks/noRootLevelClasses.js"
import { noSingleUseCallee } from "../checks/noSingleUseCallee.js"
import { noSwitchStatements } from "../checks/noSwitchStatements.js"
import { noThrow } from "../checks/noThrow.js"
import { noTryCatch } from "../checks/noTryCatch.js"
import { noUndefined } from "../checks/noUndefined.js"
import { noVoidFunctions } from "../checks/noVoidFunctions.js"
import { requireBecauseInComments } from "../checks/requireBecauseInComments.js"
import { preferConditionalReturn } from "../checks/preferConditionalReturn.js"
import { preferDataLastModule } from "../checks/preferDataLastModule.js"
import { preferDirectBooleanReturn } from "../checks/preferDirectBooleanReturn.js"
import { preferEffectArrayAppendAll } from "../checks/preferEffectArrayAppendAll.js"
import { preferEffectFn } from "../checks/preferEffectFn.js"
import { preferEffectFunctionConstant } from "../checks/preferEffectFunctionConstant.js"
import { preferEffectPropertyAccessors } from "../checks/preferEffectPropertyAccessors.js"
import { preferEffectRecordFilterMap } from "../checks/preferEffectRecordFilterMap.js"
import { preferEffectSchemaClass } from "../checks/preferEffectSchemaClass.js"
import { preferEffectSchemaConstructor } from "../checks/preferEffectSchemaConstructor.js"
import { preferEffectSchemaGuard } from "../checks/preferEffectSchemaGuard.js"
import { preferEffectSchemaIs } from "../checks/preferEffectSchemaIs.js"
import { preferHashMap } from "../checks/preferHashMap.js"
import { preferHashSet } from "../checks/preferHashSet.js"
import { preferImplicitReturn } from "../checks/preferImplicitReturn.js"
import { preferOptionMatch } from "../checks/preferOptionMatch.js"
import { preferPipeFunction } from "../checks/preferPipeFunction.js"
import {
  filterFallbackAdviceForUncoveredFiles,
  namedCheck,
  signalOf,
  silentCheck
} from "../engine/report.js"
import type { NamedCheck, Signal, Wiring } from "../engine/report.js"
import { collectSignals, namedDetection } from "../engine/derive.js"
import type { Advice, NamedDetection } from "../engine/derive.js"

const nameDetections = (
  signal: Signal
): Stream.Stream<NamedDetection, Error> => {
  const toNamedDetection = namedDetection(signal.name)

  return pipe(
    Stream.fromIterable(signal.detections),
    Stream.map(toNamedDetection)
  )
}

const replayAdvice = (
  items: ReadonlyArray<Advice>
): Stream.Stream<Advice, Error> => Stream.fromIterable(items)

export const defaultChecks: ReadonlyArray<NamedCheck> = [
  namedCheck("prefer-effect-schema-guard", preferEffectSchemaGuard),
  namedCheck("prefer-effect-schema-is", preferEffectSchemaIs),
  namedCheck("prefer-effect-schema-constructor", preferEffectSchemaConstructor),
  namedCheck("prefer-effect-schema-class", preferEffectSchemaClass),
  namedCheck("prefer-effect-fn", preferEffectFn),
  namedCheck("prefer-effect-function-constant", preferEffectFunctionConstant),
  namedCheck("prefer-effect-property-accessors", preferEffectPropertyAccessors),
  namedCheck("prefer-effect-record-filter-map", preferEffectRecordFilterMap),
  namedCheck("prefer-effect-array-append-all", preferEffectArrayAppendAll),
  namedCheck("prefer-data-last-module", preferDataLastModule),
  namedCheck("prefer-conditional-return", preferConditionalReturn),
  namedCheck("prefer-direct-boolean-return", preferDirectBooleanReturn),
  namedCheck("prefer-implicit-return", preferImplicitReturn),
  namedCheck("no-throw", noThrow),
  namedCheck("no-new-error", noNewError),
  namedCheck("no-try-catch", noTryCatch),
  namedCheck("no-undefined", noUndefined),
  namedCheck("no-void-functions", noVoidFunctions),
  namedCheck("no-root-level-classes", noRootLevelClasses),
  namedCheck("no-multi-line-comments", noMultiLineComments),
  namedCheck("require-because-in-comments", requireBecauseInComments),
  namedCheck("no-explicit-any-return", noExplicitAnyReturn),
  namedCheck("no-multiple-boolean-operators", noMultipleBooleanOperators),
  namedCheck("no-inline-boolean-expressions", noInlineBooleanExpressions),
  namedCheck("no-mutable-array-methods", noMutableArrayMethods),
  namedCheck("no-mutable-variable-declarations", noMutableVariableDeclarations),
  namedCheck("no-mutation", noMutation),
  namedCheck("no-nested-if-statements", noNestedIfStatements),
  namedCheck("no-non-null-assertion", noNonNullAssertion),
  namedCheck("no-duplicate-if-bodies", noDuplicateIfBodies),
  namedCheck("no-duplicate-function-names", noDuplicateFunctionNames),
  namedCheck("no-callbacks", noCallbacks),
  namedCheck("no-async-functions", noAsyncFunctions),
  namedCheck("no-array-spread", noArraySpread),
  namedCheck("no-for-in-loops", noForInLoops),
  namedCheck("no-for-loops", noForLoops),
  namedCheck("no-for-of-loops", noForOfLoops),
  namedCheck("no-switch-statements", noSwitchStatements),
  namedCheck("no-function-keyword", noFunctionKeyword),
  namedCheck("no-inline-closures", noInlineClosures),
  namedCheck("no-nested-calls", noNestedCalls),
  namedCheck("no-manual-type-dispatch", noManualTypeDispatch),
  namedCheck("no-monomorphic-struct-get", noMonomorphicStructGet),
  namedCheck("no-abstract-classes", noAbstractClasses),
  namedCheck("no-class-method-implementations", noClassMethodImplementations),
  namedCheck("no-raw-object-types", noRawObjectTypes),
  namedCheck("no-reexport", noReexport),
  namedCheck("no-first-party-schema-declare", noFirstPartySchemaDeclare),
  namedCheck("no-data-tagged-class", noDataTaggedClass),
  namedCheck("no-instanceof", noInstanceof),
  namedCheck("no-single-use-callee", noSingleUseCallee),
  namedCheck("prefer-hash-set", preferHashSet),
  namedCheck("prefer-hash-map", preferHashMap),
  namedCheck("prefer-option-match", preferOptionMatch),
  namedCheck("prefer-pipe-function", preferPipeFunction),
  silentCheck(
    "prefer-curried-data-last-functions",
    preferCurriedDataLastFunctions
  )
]

export const defaultDerive = (
  signals: ReadonlyArray<Signal>
): Stream.Stream<Advice, Error> => {
  const elementsOf = signalOf(signals)
  const reportedSignals = Array.filter(signals, Struct.get("reported"))
  const signalStream = Stream.fromIterable(reportedSignals)
  const namedElements = pipe(signalStream, Stream.flatMap(nameDetections))
  const noMutation = elementsOf("no-mutation")
  const preferHashMap = elementsOf("prefer-hash-map")
  const preferHashSet = elementsOf("prefer-hash-set")
  const noMutableArrayMethods = elementsOf("no-mutable-array-methods")
  const noMutableVariableDeclarations = elementsOf(
    "no-mutable-variable-declarations"
  )
  const noNestedCalls = elementsOf("no-nested-calls")
  const preferCurried = elementsOf("prefer-curried-data-last-functions")
  const imperativeAdvice = imperativeStateManager({
    noMutation,
    preferHashMap,
    preferHashSet,
    noMutableArrayMethods,
    noMutableVariableDeclarations
  })
  const launderingAdvice = sideEffectLaundering(namedElements)
  const pipelineAdvice = pipelineHostile({
    noNestedCalls,
    preferCurriedDataLastFunctions: preferCurried
  })
  const specificAdviceStreams = Stream.fromIterable([
    imperativeAdvice,
    launderingAdvice,
    pipelineAdvice
  ])
  const specificAdvice = pipe(specificAdviceStreams, Stream.flatten())
  const densityAdvice = highSignalDensity(namedElements)
  const subsystemAdvice = hotSubsystem(namedElements)
  const dominanceAdvice = ruleDominance(namedElements)

  const materializedAdvice = Effect.gen(function* () {
    const specificItems = yield* collectSignals(specificAdvice)
    const densityAfterFallbackSuppression =
      filterFallbackAdviceForUncoveredFiles(specificItems)(densityAdvice)
    const densityAdviceEffect = collectSignals(densityAfterFallbackSuppression)
    const subsystemAdviceEffect = collectSignals(subsystemAdvice)
    const dominanceAdviceEffect = collectSignals(dominanceAdvice)
    const densityItems = yield* densityAdviceEffect
    const subsystemItems = yield* subsystemAdviceEffect
    const dominanceItems = yield* dominanceAdviceEffect
    const specificReplay = replayAdvice(specificItems)
    const densityReplay = replayAdvice(densityItems)
    const subsystemReplay = replayAdvice(subsystemItems)
    const dominanceReplay = replayAdvice(dominanceItems)
    const systemicInput = {
      hotSubsystem: subsystemReplay,
      highSignalDensity: densityReplay
    }
    const systemicAdvice = systemicHotspots(systemicInput)
    const outputAdviceStreams = Stream.fromIterable([
      specificReplay,
      densityReplay,
      subsystemReplay,
      dominanceReplay,
      systemicAdvice
    ])

    return pipe(outputAdviceStreams, Stream.flatten())
  })

  return pipe(materializedAdvice, Stream.unwrap)
}

export const defaultWiring: Wiring = {
  checks: defaultChecks,
  derive: defaultDerive
}
