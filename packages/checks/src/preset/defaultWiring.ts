import { Array, Effect, Stream, Struct, pipe } from "effect"
import { highSignalDensity } from "../checks/highSignalDensity.js"
import { hotSubsystem } from "../checks/hotSubsystem.js"
import { imperativeStateManager } from "../checks/imperativeStateManager.js"
import { pipelineHostile } from "../checks/pipelineHostile.js"
import { ruleDominance } from "../checks/ruleDominance.js"
import { sideEffectLaundering } from "../checks/sideEffectLaundering.js"
import { systemicHotspots } from "../checks/systemicHotspots.js"
import { preferCurriedDataLastFunctions, preferCurriedDataLastFunctionsExamples } from "../checks/preferCurriedDataLastFunctions.js"
import { noAbstractClasses, noAbstractClassesExamples } from "../checks/noAbstractClasses.js"
import { noArraySpread, noArraySpreadExamples } from "../checks/noArraySpread.js"
import { noAsyncFunctions, noAsyncFunctionsExamples } from "../checks/noAsyncFunctions.js"
import { noCallbacks, noCallbacksExamples } from "../checks/noCallbacks.js"
import { noClassMethodImplementations, noClassMethodImplementationsExamples } from "../checks/noClassMethodImplementations.js"
import { noDataTaggedClass, noDataTaggedClassExamples } from "../checks/noDataTaggedClass.js"
import { noDuplicateFunctionNames, noDuplicateFunctionNamesExamples } from "../checks/noDuplicateFunctionNames.js"
import { noDuplicateIfBodies, noDuplicateIfBodiesExamples } from "../checks/noDuplicateIfBodies.js"
import { noExplicitAnyReturn, noExplicitAnyReturnExamples } from "../checks/noExplicitAnyReturn.js"
import { noFirstPartySchemaDeclare, noFirstPartySchemaDeclareExamples } from "../checks/noFirstPartySchemaDeclare.js"
import { noForInLoops, noForInLoopsExamples } from "../checks/noForInLoops.js"
import { noForLoops, noForLoopsExamples } from "../checks/noForLoops.js"
import { noForOfLoops, noForOfLoopsExamples } from "../checks/noForOfLoops.js"
import { noFunctionKeyword, noFunctionKeywordExamples } from "../checks/noFunctionKeyword.js"
import { noInlineBooleanExpressions, noInlineBooleanExpressionsExamples } from "../checks/noInlineBooleanExpressions.js"
import { noInlineClosures, noInlineClosuresExamples } from "../checks/noInlineClosures.js"
import { noInstanceof, noInstanceofExamples } from "../checks/noInstanceof.js"
import { noManualTypeDispatch, noManualTypeDispatchExamples } from "../checks/noManualTypeDispatch.js"
import { noMonomorphicStructGet, noMonomorphicStructGetExamples } from "../checks/noMonomorphicStructGet.js"
import { noMultiLineComments, noMultiLineCommentsExamples } from "../checks/noMultiLineComments.js"
import { noMultipleBooleanOperators, noMultipleBooleanOperatorsExamples } from "../checks/noMultipleBooleanOperators.js"
import { noMutableArrayMethods, noMutableArrayMethodsExamples } from "../checks/noMutableArrayMethods.js"
import { noMutableVariableDeclarations, noMutableVariableDeclarationsExamples } from "../checks/noMutableVariableDeclarations.js"
import { noMutation, noMutationExamples } from "../checks/noMutation.js"
import { noNestedCalls, noNestedCallsExamples } from "../checks/noNestedCalls.js"
import { noNestedIfStatements, noNestedIfStatementsExamples } from "../checks/noNestedIfStatements.js"
import { noNewError, noNewErrorExamples } from "../checks/noNewError.js"
import { noNonNullAssertion, noNonNullAssertionExamples } from "../checks/noNonNullAssertion.js"
import { noRawObjectTypes, noRawObjectTypesExamples } from "../checks/noRawObjectTypes.js"
import { noReexport, noReexportExamples } from "../checks/noReexport.js"
import { noRootLevelClasses, noRootLevelClassesExamples } from "../checks/noRootLevelClasses.js"
import { noSingleUseCallee, noSingleUseCalleeExamples } from "../checks/noSingleUseCallee.js"
import { noSwitchStatements, noSwitchStatementsExamples } from "../checks/noSwitchStatements.js"
import { noThrow, noThrowExamples } from "../checks/noThrow.js"
import { noTryCatch, noTryCatchExamples } from "../checks/noTryCatch.js"
import { noUndefined, noUndefinedExamples } from "../checks/noUndefined.js"
import { noVoidFunctions, noVoidFunctionsExamples } from "../checks/noVoidFunctions.js"
import { requireBecauseInComments, requireBecauseInCommentsExamples } from "../checks/requireBecauseInComments.js"
import { preferConditionalReturn, preferConditionalReturnExamples } from "../checks/preferConditionalReturn.js"
import { preferDataLastModule, preferDataLastModuleExamples } from "../checks/preferDataLastModule.js"
import { preferDirectBooleanReturn, preferDirectBooleanReturnExamples } from "../checks/preferDirectBooleanReturn.js"
import { preferEffectArray, preferEffectArrayExamples } from "../checks/preferEffectArray.js"
import { preferEffectArrayAppendAll, preferEffectArrayAppendAllExamples } from "../checks/preferEffectArrayAppendAll.js"
import { preferEffectFn, preferEffectFnExamples } from "../checks/preferEffectFn.js"
import { preferEffectFunctionConstant, preferEffectFunctionConstantExamples } from "../checks/preferEffectFunctionConstant.js"
import { preferEffectPropertyAccessors, preferEffectPropertyAccessorsExamples } from "../checks/preferEffectPropertyAccessors.js"
import { preferEffectRecordFilterMap, preferEffectRecordFilterMapExamples } from "../checks/preferEffectRecordFilterMap.js"
import { preferEffectSchemaClass, preferEffectSchemaClassExamples } from "../checks/preferEffectSchemaClass.js"
import { preferEffectSchemaConstructor, preferEffectSchemaConstructorExamples } from "../checks/preferEffectSchemaConstructor.js"
import { preferEffectSchemaGuard, preferEffectSchemaGuardExamples } from "../checks/preferEffectSchemaGuard.js"
import { preferEffectSchemaIs, preferEffectSchemaIsExamples } from "../checks/preferEffectSchemaIs.js"
import { preferHashMap, preferHashMapExamples } from "../checks/preferHashMap.js"
import { preferHashSet, preferHashSetExamples } from "../checks/preferHashSet.js"
import { preferImplicitReturn, preferImplicitReturnExamples } from "../checks/preferImplicitReturn.js"
import { preferOptionMatch, preferOptionMatchExamples } from "../checks/preferOptionMatch.js"
import { preferPipeFunction, preferPipeFunctionExamples } from "../checks/preferPipeFunction.js"
import {
  filterFallbackAdviceForUncoveredFiles,
  namedCheck,
  signalOf,
  silentCheck
} from "@better-typescript/core/engine/report"
import type { NamedCheck, Signal, Wiring } from "@better-typescript/core/engine/report"
import { collectSignals, namedDetection } from "@better-typescript/core/engine/derive"
import type { Advice, NamedDetection } from "@better-typescript/core/engine/derive"

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
  namedCheck("prefer-effect-schema-guard", preferEffectSchemaGuard, preferEffectSchemaGuardExamples),
  namedCheck("prefer-effect-schema-is", preferEffectSchemaIs, preferEffectSchemaIsExamples),
  namedCheck("prefer-effect-schema-constructor", preferEffectSchemaConstructor, preferEffectSchemaConstructorExamples),
  namedCheck("prefer-effect-schema-class", preferEffectSchemaClass, preferEffectSchemaClassExamples),
  namedCheck("prefer-effect-fn", preferEffectFn, preferEffectFnExamples),
  namedCheck("prefer-effect-function-constant", preferEffectFunctionConstant, preferEffectFunctionConstantExamples),
  namedCheck("prefer-effect-property-accessors", preferEffectPropertyAccessors, preferEffectPropertyAccessorsExamples),
  namedCheck("prefer-effect-record-filter-map", preferEffectRecordFilterMap, preferEffectRecordFilterMapExamples),
  namedCheck("prefer-effect-array", preferEffectArray, preferEffectArrayExamples),
  namedCheck("prefer-effect-array-append-all", preferEffectArrayAppendAll, preferEffectArrayAppendAllExamples),
  namedCheck("prefer-data-last-module", preferDataLastModule, preferDataLastModuleExamples),
  namedCheck("prefer-conditional-return", preferConditionalReturn, preferConditionalReturnExamples),
  namedCheck("prefer-direct-boolean-return", preferDirectBooleanReturn, preferDirectBooleanReturnExamples),
  namedCheck("prefer-implicit-return", preferImplicitReturn, preferImplicitReturnExamples),
  namedCheck("no-throw", noThrow, noThrowExamples),
  namedCheck("no-new-error", noNewError, noNewErrorExamples),
  namedCheck("no-try-catch", noTryCatch, noTryCatchExamples),
  namedCheck("no-undefined", noUndefined, noUndefinedExamples),
  namedCheck("no-void-functions", noVoidFunctions, noVoidFunctionsExamples),
  namedCheck("no-root-level-classes", noRootLevelClasses, noRootLevelClassesExamples),
  namedCheck("no-multi-line-comments", noMultiLineComments, noMultiLineCommentsExamples),
  namedCheck("require-because-in-comments", requireBecauseInComments, requireBecauseInCommentsExamples),
  namedCheck("no-explicit-any-return", noExplicitAnyReturn, noExplicitAnyReturnExamples),
  namedCheck("no-multiple-boolean-operators", noMultipleBooleanOperators, noMultipleBooleanOperatorsExamples),
  namedCheck("no-inline-boolean-expressions", noInlineBooleanExpressions, noInlineBooleanExpressionsExamples),
  namedCheck("no-mutable-array-methods", noMutableArrayMethods, noMutableArrayMethodsExamples),
  namedCheck("no-mutable-variable-declarations", noMutableVariableDeclarations, noMutableVariableDeclarationsExamples),
  namedCheck("no-mutation", noMutation, noMutationExamples),
  namedCheck("no-nested-if-statements", noNestedIfStatements, noNestedIfStatementsExamples),
  namedCheck("no-non-null-assertion", noNonNullAssertion, noNonNullAssertionExamples),
  namedCheck("no-duplicate-if-bodies", noDuplicateIfBodies, noDuplicateIfBodiesExamples),
  namedCheck("no-duplicate-function-names", noDuplicateFunctionNames, noDuplicateFunctionNamesExamples),
  namedCheck("no-callbacks", noCallbacks, noCallbacksExamples),
  namedCheck("no-async-functions", noAsyncFunctions, noAsyncFunctionsExamples),
  namedCheck("no-array-spread", noArraySpread, noArraySpreadExamples),
  namedCheck("no-for-in-loops", noForInLoops, noForInLoopsExamples),
  namedCheck("no-for-loops", noForLoops, noForLoopsExamples),
  namedCheck("no-for-of-loops", noForOfLoops, noForOfLoopsExamples),
  namedCheck("no-switch-statements", noSwitchStatements, noSwitchStatementsExamples),
  namedCheck("no-function-keyword", noFunctionKeyword, noFunctionKeywordExamples),
  namedCheck("no-inline-closures", noInlineClosures, noInlineClosuresExamples),
  namedCheck("no-nested-calls", noNestedCalls, noNestedCallsExamples),
  namedCheck("no-manual-type-dispatch", noManualTypeDispatch, noManualTypeDispatchExamples),
  namedCheck("no-monomorphic-struct-get", noMonomorphicStructGet, noMonomorphicStructGetExamples),
  namedCheck("no-abstract-classes", noAbstractClasses, noAbstractClassesExamples),
  namedCheck("no-class-method-implementations", noClassMethodImplementations, noClassMethodImplementationsExamples),
  namedCheck("no-raw-object-types", noRawObjectTypes, noRawObjectTypesExamples),
  namedCheck("no-reexport", noReexport, noReexportExamples),
  namedCheck("no-first-party-schema-declare", noFirstPartySchemaDeclare, noFirstPartySchemaDeclareExamples),
  namedCheck("no-data-tagged-class", noDataTaggedClass, noDataTaggedClassExamples),
  namedCheck("no-instanceof", noInstanceof, noInstanceofExamples),
  namedCheck("no-single-use-callee", noSingleUseCallee, noSingleUseCalleeExamples),
  namedCheck("prefer-hash-set", preferHashSet, preferHashSetExamples),
  namedCheck("prefer-hash-map", preferHashMap, preferHashMapExamples),
  namedCheck("prefer-option-match", preferOptionMatch, preferOptionMatchExamples),
  namedCheck("prefer-pipe-function", preferPipeFunction, preferPipeFunctionExamples),
  silentCheck("prefer-curried-data-last-functions", preferCurriedDataLastFunctions, preferCurriedDataLastFunctionsExamples)
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
