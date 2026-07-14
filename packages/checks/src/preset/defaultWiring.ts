import { Array, Effect, Stream, Struct, pipe } from "effect"
import { highSignalDensity } from "../checks/highSignalDensity.js"
import { hotSubsystem } from "../checks/hotSubsystem/hotSubsystem.js"
import { imperativeStateManager } from "../checks/imperativeStateManager/imperativeStateManager.js"
import { pipelineHostile } from "../checks/pipelineHostile/pipelineHostile.js"
import {
  conceptControl,
  conceptControlExamples
} from "../checks/conceptControl/conceptControl.js"
import { conceptProliferation } from "../checks/conceptControl/conceptProliferation.js"
import { ruleDominance } from "../checks/ruleDominance.js"
import { sideEffectLaundering } from "../checks/sideEffectLaundering.js"
import { systemicHotspots } from "../checks/systemicHotspots/systemicHotspots.js"
import {
  preferCurriedDataLastFunctions,
  preferCurriedDataLastFunctionsExamples
} from "../checks/preferCurriedDataLastFunctions/preferCurriedDataLastFunctions.js"
import {
  preferSchemaTaggedClass,
  preferSchemaTaggedClassExamples
} from "../checks/preferSchemaTaggedClass.js"
import {
  requireWireSafeSchemaTaggedClass,
  requireWireSafeSchemaTaggedClassExamples
} from "../checks/requireWireSafeSchemaTaggedClass.js"
import {
  noArraySpread,
  noArraySpreadExamples
} from "../checks/noArraySpread.js"
import {
  noPrimitiveArrayConstructors,
  noPrimitiveArrayConstructorsExamples
} from "../checks/noPrimitiveArrayConstructors.js"
import {
  noAsyncFunctions,
  noAsyncFunctionsExamples
} from "../checks/noAsyncFunctions.js"
import { noCallbacks, noCallbacksExamples } from "../checks/noCallbacks.js"
import {
  noDuplicateFunctionNames,
  noDuplicateFunctionNamesExamples
} from "../checks/noDuplicateFunctionNames.js"
import {
  noDuplicateIfBodies,
  noDuplicateIfBodiesExamples
} from "../checks/noDuplicateIfBodies.js"
import {
  noExplicitAnyReturn,
  noExplicitAnyReturnExamples
} from "../checks/noExplicitAnyReturn.js"
import {
  noFirstPartySchemaDeclare,
  noFirstPartySchemaDeclareExamples
} from "../checks/noFirstPartySchemaDeclare.js"
import { noForInLoops, noForInLoopsExamples } from "../checks/noForInLoops.js"
import { noForLoops, noForLoopsExamples } from "../checks/noForLoops.js"
import { noForOfLoops, noForOfLoopsExamples } from "../checks/noForOfLoops.js"
import {
  noFunctionKeyword,
  noFunctionKeywordExamples
} from "../checks/noFunctionKeyword.js"
import {
  noInlineBooleanExpressions,
  noInlineBooleanExpressionsExamples
} from "../checks/noInlineBooleanExpressions.js"
import {
  noInlineClosures,
  noInlineClosuresExamples
} from "../checks/noInlineClosures.js"
import { noInstanceof, noInstanceofExamples } from "../checks/noInstanceof.js"
import {
  noManualTypeDispatch,
  noManualTypeDispatchExamples
} from "../checks/noManualTypeDispatch.js"
import {
  noMonomorphicStructGet,
  noMonomorphicStructGetExamples
} from "../checks/noMonomorphicStructGet.js"
import {
  noMultiLineComments,
  noMultiLineCommentsExamples
} from "../checks/noMultiLineComments.js"
import {
  noMultipleBooleanOperators,
  noMultipleBooleanOperatorsExamples
} from "../checks/noMultipleBooleanOperators.js"
import {
  noMutableArrayMethods,
  noMutableArrayMethodsExamples
} from "../checks/noMutableArrayMethods.js"
import {
  noMutableVariableDeclarations,
  noMutableVariableDeclarationsExamples
} from "../checks/noMutableVariableDeclarations.js"
import { noMutation, noMutationExamples } from "../checks/noMutation.js"
import { noWeakMap, noWeakMapExamples } from "../checks/noWeakMap.js"
import {
  noNestedCalls,
  noNestedCallsExamples
} from "../checks/noNestedCalls.js"
import {
  noNestedIfStatements,
  noNestedIfStatementsExamples
} from "../checks/noNestedIfStatements.js"
import { noNewError, noNewErrorExamples } from "../checks/noNewError.js"
import {
  noNonNullAssertion,
  noNonNullAssertionExamples
} from "../checks/noNonNullAssertion.js"
import {
  noRawObjectTypes,
  noRawObjectTypesExamples
} from "../checks/noRawObjectTypes.js"
import {
  noSwitchStatements,
  noSwitchStatementsExamples
} from "../checks/noSwitchStatements.js"
import { noThrow, noThrowExamples } from "../checks/noThrow.js"
import { noTryCatch, noTryCatchExamples } from "../checks/noTryCatch.js"
import { noUndefined, noUndefinedExamples } from "../checks/noUndefined.js"
import { noUnused, noUnusedExamples } from "../checks/noUnused.js"
import {
  noVoidFunctions,
  noVoidFunctionsExamples
} from "../checks/noVoidFunctions.js"
import {
  requireBecauseInComments,
  requireBecauseInCommentsExamples
} from "../checks/requireBecauseInComments.js"
import {
  requireBlankLinesAroundMultilineDeclarations,
  requireBlankLinesAroundMultilineDeclarationsExamples
} from "../checks/requireBlankLinesAroundMultilineDeclarations.js"
import {
  preferConditionalReturn,
  preferConditionalReturnExamples
} from "../checks/preferConditionalReturn.js"
import {
  preferDataLastModule,
  preferDataLastModuleExamples
} from "../checks/preferDataLastModule.js"
import {
  preferDirectBooleanReturn,
  preferDirectBooleanReturnExamples
} from "../checks/preferDirectBooleanReturn.js"
import {
  preferDirectYield,
  preferDirectYieldExamples
} from "../checks/preferDirectYield.js"
import {
  preferEffectArray,
  preferEffectArrayExamples
} from "../checks/preferEffectArray.js"
import {
  preferEffectArrayAppendAll,
  preferEffectArrayAppendAllExamples
} from "../checks/preferEffectArrayAppendAll.js"
import {
  preferEffectFn,
  preferEffectFnExamples
} from "../checks/preferEffectFn.js"
import {
  preferEffectFunctionConstant,
  preferEffectFunctionConstantExamples
} from "../checks/preferEffectFunctionConstant.js"
import {
  preferEffectPropertyAccessors,
  preferEffectPropertyAccessorsExamples
} from "../checks/preferEffectPropertyAccessors.js"
import {
  preferEffectRecordFilterMap,
  preferEffectRecordFilterMapExamples
} from "../checks/preferEffectRecordFilterMap.js"
import {
  preferEffectSchemaClass,
  preferEffectSchemaClassExamples
} from "../checks/preferEffectSchemaClass.js"
import {
  preferEffectSchemaConstructor,
  preferEffectSchemaConstructorExamples
} from "../checks/preferEffectSchemaConstructor.js"
import {
  preferEffectSchemaGuard,
  preferEffectSchemaGuardExamples
} from "../checks/preferEffectSchemaGuard.js"
import {
  preferEffectSchemaIs,
  preferEffectSchemaIsExamples
} from "../checks/preferEffectSchemaIs.js"
import {
  preferHashMap,
  preferHashMapExamples
} from "../checks/preferHashMap.js"
import {
  preferHashSet,
  preferHashSetExamples
} from "../checks/preferHashSet.js"
import {
  preferFunctionComposition,
  preferFunctionCompositionExamples
} from "../checks/preferFunctionComposition.js"
import {
  preferEtaReduction,
  preferEtaReductionExamples
} from "../checks/preferEtaReduction.js"
import {
  preferFunctionFlip,
  preferFunctionFlipExamples
} from "../checks/preferFunctionFlip.js"
import {
  preferImplicitReturn,
  preferImplicitReturnExamples
} from "../checks/preferImplicitReturn.js"
import {
  preferOptionMatch,
  preferOptionMatchExamples
} from "../checks/preferOptionMatch.js"
import {
  preferPipeFunction,
  preferPipeFunctionExamples
} from "../checks/preferPipeFunction.js"
import {
  defineConfig,
  filterFallbackAdviceForUncoveredFiles,
  namedCheck,
  signalOf,
  silentCheck
} from "@better-typescript/core/engine/report"
import type {
  NamedCheck,
  Signal,
  Wiring,
  WiringConfig
} from "@better-typescript/core/engine/report/data"
import {
  collectSignals,
  namedDetection
} from "@better-typescript/core/engine/derive"
import type {
  Advice,
  NamedDetection
} from "@better-typescript/core/engine/derive/data"

const nameDetections = (
  signal: Signal
): Stream.Stream<NamedDetection, Error> => {
  const toNamedDetection = namedDetection(signal.name)

  return pipe(
    Stream.fromIterable(signal.detections),
    Stream.map(toNamedDetection)
  )
}

const replayAdvice = Stream.fromIterable

const preferEffectSchemaGuardCheck = namedCheck(
  "prefer-effect-schema-guard",
  preferEffectSchemaGuard,
  preferEffectSchemaGuardExamples
)

const preferEffectSchemaIsCheck = namedCheck(
  "prefer-effect-schema-is",
  preferEffectSchemaIs,
  preferEffectSchemaIsExamples
)

const preferEffectSchemaConstructorCheck = namedCheck(
  "prefer-effect-schema-constructor",
  preferEffectSchemaConstructor,
  preferEffectSchemaConstructorExamples
)

const preferEffectSchemaClassCheck = namedCheck(
  "prefer-effect-schema-class",
  preferEffectSchemaClass,
  preferEffectSchemaClassExamples
)

const preferEffectFnCheck = namedCheck(
  "prefer-effect-fn",
  preferEffectFn,
  preferEffectFnExamples
)

const preferEffectFunctionConstantCheck = namedCheck(
  "prefer-effect-function-constant",
  preferEffectFunctionConstant,
  preferEffectFunctionConstantExamples
)

const preferEffectPropertyAccessorsCheck = namedCheck(
  "prefer-effect-property-accessors",
  preferEffectPropertyAccessors,
  preferEffectPropertyAccessorsExamples
)

const preferEffectRecordFilterMapCheck = namedCheck(
  "prefer-effect-record-filter-map",
  preferEffectRecordFilterMap,
  preferEffectRecordFilterMapExamples
)

const preferEffectArrayCheck = namedCheck(
  "prefer-effect-array",
  preferEffectArray,
  preferEffectArrayExamples
)

const preferEffectArrayAppendAllCheck = namedCheck(
  "prefer-effect-array-append-all",
  preferEffectArrayAppendAll,
  preferEffectArrayAppendAllExamples
)

const preferDataLastModuleCheck = namedCheck(
  "prefer-data-last-module",
  preferDataLastModule,
  preferDataLastModuleExamples
)

const preferSchemaTaggedClassCheck = namedCheck(
  "prefer-schema-tagged-class",
  preferSchemaTaggedClass,
  preferSchemaTaggedClassExamples
)

const requireWireSafeSchemaTaggedClassCheck = namedCheck(
  "require-wire-safe-schema-tagged-class",
  requireWireSafeSchemaTaggedClass,
  requireWireSafeSchemaTaggedClassExamples
)

const conceptControlCheck = namedCheck(
  "concept-control",
  conceptControl,
  conceptControlExamples
)

const preferConditionalReturnCheck = namedCheck(
  "prefer-conditional-return",
  preferConditionalReturn,
  preferConditionalReturnExamples
)

const preferDirectBooleanReturnCheck = namedCheck(
  "prefer-direct-boolean-return",
  preferDirectBooleanReturn,
  preferDirectBooleanReturnExamples
)

const preferDirectYieldCheck = namedCheck(
  "prefer-direct-yield",
  preferDirectYield,
  preferDirectYieldExamples
)

const preferFunctionCompositionCheck = namedCheck(
  "prefer-function-composition",
  preferFunctionComposition,
  preferFunctionCompositionExamples
)

const preferEtaReductionCheck = namedCheck(
  "prefer-eta-reduction",
  preferEtaReduction,
  preferEtaReductionExamples
)

const preferFunctionFlipCheck = namedCheck(
  "prefer-function-flip",
  preferFunctionFlip,
  preferFunctionFlipExamples
)

const preferImplicitReturnCheck = namedCheck(
  "prefer-implicit-return",
  preferImplicitReturn,
  preferImplicitReturnExamples
)

const noThrowCheck = namedCheck("no-throw", noThrow, noThrowExamples)

const noNewErrorCheck = namedCheck(
  "no-new-error",
  noNewError,
  noNewErrorExamples
)

const noTryCatchCheck = namedCheck(
  "no-try-catch",
  noTryCatch,
  noTryCatchExamples
)

const noUndefinedCheck = namedCheck(
  "no-undefined",
  noUndefined,
  noUndefinedExamples
)

const noUnusedCheck = namedCheck("no-unused", noUnused, noUnusedExamples)

const noVoidFunctionsCheck = namedCheck(
  "no-void-functions",
  noVoidFunctions,
  noVoidFunctionsExamples
)

const noMultiLineCommentsCheck = namedCheck(
  "no-multi-line-comments",
  noMultiLineComments,
  noMultiLineCommentsExamples
)

const requireBecauseInCommentsCheck = namedCheck(
  "require-because-in-comments",
  requireBecauseInComments,
  requireBecauseInCommentsExamples
)

const requireBlankLinesAroundMultilineDeclarationsCheck = namedCheck(
  "require-blank-lines-around-multiline-declarations",
  requireBlankLinesAroundMultilineDeclarations,
  requireBlankLinesAroundMultilineDeclarationsExamples
)

const noExplicitAnyReturnCheck = namedCheck(
  "no-explicit-any-return",
  noExplicitAnyReturn,
  noExplicitAnyReturnExamples
)

const noMultipleBooleanOperatorsCheck = namedCheck(
  "no-multiple-boolean-operators",
  noMultipleBooleanOperators,
  noMultipleBooleanOperatorsExamples
)

const noInlineBooleanExpressionsCheck = namedCheck(
  "no-inline-boolean-expressions",
  noInlineBooleanExpressions,
  noInlineBooleanExpressionsExamples
)

const noMutableArrayMethodsCheck = namedCheck(
  "no-mutable-array-methods",
  noMutableArrayMethods,
  noMutableArrayMethodsExamples
)

const noMutableVariableDeclarationsCheck = namedCheck(
  "no-mutable-variable-declarations",
  noMutableVariableDeclarations,
  noMutableVariableDeclarationsExamples
)

const noMutationCheck = namedCheck(
  "no-mutation",
  noMutation,
  noMutationExamples
)

const noWeakMapCheck = namedCheck("no-weak-map", noWeakMap, noWeakMapExamples)

const noNestedIfStatementsCheck = namedCheck(
  "no-nested-if-statements",
  noNestedIfStatements,
  noNestedIfStatementsExamples
)

const noNonNullAssertionCheck = namedCheck(
  "no-non-null-assertion",
  noNonNullAssertion,
  noNonNullAssertionExamples
)

const noDuplicateIfBodiesCheck = namedCheck(
  "no-duplicate-if-bodies",
  noDuplicateIfBodies,
  noDuplicateIfBodiesExamples
)

const noDuplicateFunctionNamesCheck = namedCheck(
  "no-duplicate-function-names",
  noDuplicateFunctionNames,
  noDuplicateFunctionNamesExamples
)

const noCallbacksCheck = namedCheck(
  "no-callbacks",
  noCallbacks,
  noCallbacksExamples
)

const noAsyncFunctionsCheck = namedCheck(
  "no-async-functions",
  noAsyncFunctions,
  noAsyncFunctionsExamples
)

const noArraySpreadCheck = namedCheck(
  "no-array-spread",
  noArraySpread,
  noArraySpreadExamples
)

const noPrimitiveArrayConstructorsCheck = namedCheck(
  "no-primitive-array-constructors",
  noPrimitiveArrayConstructors,
  noPrimitiveArrayConstructorsExamples
)

const noForInLoopsCheck = namedCheck(
  "no-for-in-loops",
  noForInLoops,
  noForInLoopsExamples
)

const noForLoopsCheck = namedCheck(
  "no-for-loops",
  noForLoops,
  noForLoopsExamples
)

const noForOfLoopsCheck = namedCheck(
  "no-for-of-loops",
  noForOfLoops,
  noForOfLoopsExamples
)

const noSwitchStatementsCheck = namedCheck(
  "no-switch-statements",
  noSwitchStatements,
  noSwitchStatementsExamples
)

const noFunctionKeywordCheck = namedCheck(
  "no-function-keyword",
  noFunctionKeyword,
  noFunctionKeywordExamples
)

const noInlineClosuresCheck = namedCheck(
  "no-inline-closures",
  noInlineClosures,
  noInlineClosuresExamples
)

const noNestedCallsCheck = namedCheck(
  "no-nested-calls",
  noNestedCalls,
  noNestedCallsExamples
)

const noManualTypeDispatchCheck = namedCheck(
  "no-manual-type-dispatch",
  noManualTypeDispatch,
  noManualTypeDispatchExamples
)

const noMonomorphicStructGetCheck = namedCheck(
  "no-monomorphic-struct-get",
  noMonomorphicStructGet,
  noMonomorphicStructGetExamples
)

const noRawObjectTypesCheck = namedCheck(
  "no-raw-object-types",
  noRawObjectTypes,
  noRawObjectTypesExamples
)

const noFirstPartySchemaDeclareCheck = namedCheck(
  "no-first-party-schema-declare",
  noFirstPartySchemaDeclare,
  noFirstPartySchemaDeclareExamples
)

const noInstanceofCheck = namedCheck(
  "no-instanceof",
  noInstanceof,
  noInstanceofExamples
)

const preferHashSetCheck = namedCheck(
  "prefer-hash-set",
  preferHashSet,
  preferHashSetExamples
)

const preferHashMapCheck = namedCheck(
  "prefer-hash-map",
  preferHashMap,
  preferHashMapExamples
)

const preferOptionMatchCheck = namedCheck(
  "prefer-option-match",
  preferOptionMatch,
  preferOptionMatchExamples
)

const preferPipeFunctionCheck = namedCheck(
  "prefer-pipe-function",
  preferPipeFunction,
  preferPipeFunctionExamples
)

const preferCurriedDataLastFunctionsCheck = silentCheck(
  "prefer-curried-data-last-functions",
  preferCurriedDataLastFunctions,
  preferCurriedDataLastFunctionsExamples
)

export const defaultChecks: ReadonlyArray<NamedCheck> = Array.make(
  preferEffectSchemaGuardCheck,
  preferEffectSchemaIsCheck,
  preferEffectSchemaConstructorCheck,
  preferEffectSchemaClassCheck,
  preferEffectFnCheck,
  preferEffectFunctionConstantCheck,
  preferEffectPropertyAccessorsCheck,
  preferEffectRecordFilterMapCheck,
  preferEffectArrayCheck,
  preferEffectArrayAppendAllCheck,
  preferDataLastModuleCheck,
  preferSchemaTaggedClassCheck,
  requireWireSafeSchemaTaggedClassCheck,
  conceptControlCheck,
  preferConditionalReturnCheck,
  preferDirectBooleanReturnCheck,
  preferDirectYieldCheck,
  preferFunctionCompositionCheck,
  preferEtaReductionCheck,
  preferFunctionFlipCheck,
  preferImplicitReturnCheck,
  noThrowCheck,
  noNewErrorCheck,
  noTryCatchCheck,
  noUndefinedCheck,
  noUnusedCheck,
  noVoidFunctionsCheck,
  noMultiLineCommentsCheck,
  requireBecauseInCommentsCheck,
  requireBlankLinesAroundMultilineDeclarationsCheck,
  noExplicitAnyReturnCheck,
  noMultipleBooleanOperatorsCheck,
  noInlineBooleanExpressionsCheck,
  noMutableArrayMethodsCheck,
  noMutableVariableDeclarationsCheck,
  noMutationCheck,
  noWeakMapCheck,
  noNestedIfStatementsCheck,
  noNonNullAssertionCheck,
  noDuplicateIfBodiesCheck,
  noDuplicateFunctionNamesCheck,
  noCallbacksCheck,
  noAsyncFunctionsCheck,
  noArraySpreadCheck,
  noPrimitiveArrayConstructorsCheck,
  noForInLoopsCheck,
  noForLoopsCheck,
  noForOfLoopsCheck,
  noSwitchStatementsCheck,
  noFunctionKeywordCheck,
  noInlineClosuresCheck,
  noNestedCallsCheck,
  noManualTypeDispatchCheck,
  noMonomorphicStructGetCheck,
  noRawObjectTypesCheck,
  noFirstPartySchemaDeclareCheck,
  noInstanceofCheck,
  preferHashSetCheck,
  preferHashMapCheck,
  preferOptionMatchCheck,
  preferPipeFunctionCheck,
  preferCurriedDataLastFunctionsCheck
)

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

export const defaultWiring: Wiring = {
  checks: defaultChecks,
  derive: defaultDerive
}

const defaultFiles = Array.of("**/*")

const defaultConfigEntries: WiringConfig = Array.of({
  files: defaultFiles,
  wiring: defaultWiring
})

export const defaultConfig: WiringConfig = defineConfig(defaultConfigEntries)
