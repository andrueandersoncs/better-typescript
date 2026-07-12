import { Array, Effect, Stream, Struct, pipe } from "effect"
import { highSignalDensity } from "../checks/highSignalDensity.js"
import { hotSubsystem } from "../checks/hotSubsystem/hotSubsystem.js"
import { imperativeStateManager } from "../checks/imperativeStateManager/imperativeStateManager.js"
import { pipelineHostile } from "../checks/pipelineHostile/pipelineHostile.js"
import { ruleDominance } from "../checks/ruleDominance.js"
import { sideEffectLaundering } from "../checks/sideEffectLaundering.js"
import { systemicHotspots } from "../checks/systemicHotspots/systemicHotspots.js"
import {
  preferCurriedDataLastFunctions,
  preferCurriedDataLastFunctionsExamples
} from "../checks/preferCurriedDataLastFunctions/preferCurriedDataLastFunctions.js"
import {
  noAbstractClasses,
  noAbstractClassesExamples
} from "../checks/noAbstractClasses.js"
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
  noClassMethodImplementations,
  noClassMethodImplementationsExamples
} from "../checks/noClassMethodImplementations.js"
import {
  noDataTaggedClass,
  noDataTaggedClassExamples
} from "../checks/noDataTaggedClass.js"
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
import { noReexport, noReexportExamples } from "../checks/noReexport.js"
import {
  noRootLevelClasses,
  noRootLevelClassesExamples
} from "../checks/noRootLevelClasses.js"
import {
  noSingleUseCallee,
  noSingleUseCalleeExamples
} from "../checks/noSingleUseCallee/noSingleUseCallee.js"
import {
  noSwitchStatements,
  noSwitchStatementsExamples
} from "../checks/noSwitchStatements.js"
import { noThrow, noThrowExamples } from "../checks/noThrow.js"
import { noTryCatch, noTryCatchExamples } from "../checks/noTryCatch.js"
import { noUndefined, noUndefinedExamples } from "../checks/noUndefined.js"
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
  preferDedicatedDataStructureFiles,
  preferDedicatedDataStructureFilesExamples
} from "../checks/preferDedicatedDataStructureFiles.js"
import {
  preferDirectBooleanReturn,
  preferDirectBooleanReturnExamples
} from "../checks/preferDirectBooleanReturn.js"
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
  filterFallbackAdviceForUncoveredFiles,
  namedCheck,
  signalOf,
  silentCheck
} from "@better-typescript/core/engine/report"
import type {
  NamedCheck,
  Signal,
  Wiring
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

const value229 = namedCheck(
  "prefer-effect-schema-guard",
  preferEffectSchemaGuard,
  preferEffectSchemaGuardExamples
)

const value230 = namedCheck(
  "prefer-effect-schema-is",
  preferEffectSchemaIs,
  preferEffectSchemaIsExamples
)

const value231 = namedCheck(
  "prefer-effect-schema-constructor",
  preferEffectSchemaConstructor,
  preferEffectSchemaConstructorExamples
)

const value232 = namedCheck(
  "prefer-effect-schema-class",
  preferEffectSchemaClass,
  preferEffectSchemaClassExamples
)

const value233 = namedCheck(
  "prefer-effect-fn",
  preferEffectFn,
  preferEffectFnExamples
)

const value234 = namedCheck(
  "prefer-effect-function-constant",
  preferEffectFunctionConstant,
  preferEffectFunctionConstantExamples
)

const value235 = namedCheck(
  "prefer-effect-property-accessors",
  preferEffectPropertyAccessors,
  preferEffectPropertyAccessorsExamples
)

const value236 = namedCheck(
  "prefer-effect-record-filter-map",
  preferEffectRecordFilterMap,
  preferEffectRecordFilterMapExamples
)

const value237 = namedCheck(
  "prefer-effect-array",
  preferEffectArray,
  preferEffectArrayExamples
)

const value238 = namedCheck(
  "prefer-effect-array-append-all",
  preferEffectArrayAppendAll,
  preferEffectArrayAppendAllExamples
)

const value239 = namedCheck(
  "prefer-data-last-module",
  preferDataLastModule,
  preferDataLastModuleExamples
)

const value240 = namedCheck(
  "prefer-dedicated-data-structure-files",
  preferDedicatedDataStructureFiles,
  preferDedicatedDataStructureFilesExamples
)

const value241 = namedCheck(
  "prefer-conditional-return",
  preferConditionalReturn,
  preferConditionalReturnExamples
)

const value242 = namedCheck(
  "prefer-direct-boolean-return",
  preferDirectBooleanReturn,
  preferDirectBooleanReturnExamples
)

const value243 = namedCheck(
  "prefer-function-composition",
  preferFunctionComposition,
  preferFunctionCompositionExamples
)

const value244 = namedCheck(
  "prefer-eta-reduction",
  preferEtaReduction,
  preferEtaReductionExamples
)

const value245 = namedCheck(
  "prefer-implicit-return",
  preferImplicitReturn,
  preferImplicitReturnExamples
)

const value246 = namedCheck("no-throw", noThrow, noThrowExamples)
const value247 = namedCheck("no-new-error", noNewError, noNewErrorExamples)
const value248 = namedCheck("no-try-catch", noTryCatch, noTryCatchExamples)
const value249 = namedCheck("no-undefined", noUndefined, noUndefinedExamples)

const value250 = namedCheck(
  "no-void-functions",
  noVoidFunctions,
  noVoidFunctionsExamples
)

const value251 = namedCheck(
  "no-root-level-classes",
  noRootLevelClasses,
  noRootLevelClassesExamples
)

const value252 = namedCheck(
  "no-multi-line-comments",
  noMultiLineComments,
  noMultiLineCommentsExamples
)

const value253 = namedCheck(
  "require-because-in-comments",
  requireBecauseInComments,
  requireBecauseInCommentsExamples
)

const value254 = namedCheck(
  "require-blank-lines-around-multiline-declarations",
  requireBlankLinesAroundMultilineDeclarations,
  requireBlankLinesAroundMultilineDeclarationsExamples
)

const value255 = namedCheck(
  "no-explicit-any-return",
  noExplicitAnyReturn,
  noExplicitAnyReturnExamples
)

const value256 = namedCheck(
  "no-multiple-boolean-operators",
  noMultipleBooleanOperators,
  noMultipleBooleanOperatorsExamples
)

const value257 = namedCheck(
  "no-inline-boolean-expressions",
  noInlineBooleanExpressions,
  noInlineBooleanExpressionsExamples
)

const value258 = namedCheck(
  "no-mutable-array-methods",
  noMutableArrayMethods,
  noMutableArrayMethodsExamples
)

const value259 = namedCheck(
  "no-mutable-variable-declarations",
  noMutableVariableDeclarations,
  noMutableVariableDeclarationsExamples
)

const value260 = namedCheck("no-mutation", noMutation, noMutationExamples)

const value261 = namedCheck(
  "no-nested-if-statements",
  noNestedIfStatements,
  noNestedIfStatementsExamples
)

const value262 = namedCheck(
  "no-non-null-assertion",
  noNonNullAssertion,
  noNonNullAssertionExamples
)

const value263 = namedCheck(
  "no-duplicate-if-bodies",
  noDuplicateIfBodies,
  noDuplicateIfBodiesExamples
)

const value264 = namedCheck(
  "no-duplicate-function-names",
  noDuplicateFunctionNames,
  noDuplicateFunctionNamesExamples
)

const value265 = namedCheck("no-callbacks", noCallbacks, noCallbacksExamples)

const value266 = namedCheck(
  "no-async-functions",
  noAsyncFunctions,
  noAsyncFunctionsExamples
)

const value267 = namedCheck(
  "no-array-spread",
  noArraySpread,
  noArraySpreadExamples
)

const value268 = namedCheck(
  "no-primitive-array-constructors",
  noPrimitiveArrayConstructors,
  noPrimitiveArrayConstructorsExamples
)

const value269 = namedCheck(
  "no-for-in-loops",
  noForInLoops,
  noForInLoopsExamples
)

const value270 = namedCheck("no-for-loops", noForLoops, noForLoopsExamples)

const value271 = namedCheck(
  "no-for-of-loops",
  noForOfLoops,
  noForOfLoopsExamples
)

const value272 = namedCheck(
  "no-switch-statements",
  noSwitchStatements,
  noSwitchStatementsExamples
)

const value273 = namedCheck(
  "no-function-keyword",
  noFunctionKeyword,
  noFunctionKeywordExamples
)

const value274 = namedCheck(
  "no-inline-closures",
  noInlineClosures,
  noInlineClosuresExamples
)

const value275 = namedCheck(
  "no-nested-calls",
  noNestedCalls,
  noNestedCallsExamples
)

const value276 = namedCheck(
  "no-manual-type-dispatch",
  noManualTypeDispatch,
  noManualTypeDispatchExamples
)

const value277 = namedCheck(
  "no-monomorphic-struct-get",
  noMonomorphicStructGet,
  noMonomorphicStructGetExamples
)

const value278 = namedCheck(
  "no-abstract-classes",
  noAbstractClasses,
  noAbstractClassesExamples
)

const value279 = namedCheck(
  "no-class-method-implementations",
  noClassMethodImplementations,
  noClassMethodImplementationsExamples
)

const value280 = namedCheck(
  "no-raw-object-types",
  noRawObjectTypes,
  noRawObjectTypesExamples
)

const value281 = namedCheck("no-reexport", noReexport, noReexportExamples)

const value282 = namedCheck(
  "no-first-party-schema-declare",
  noFirstPartySchemaDeclare,
  noFirstPartySchemaDeclareExamples
)

const value283 = namedCheck(
  "no-data-tagged-class",
  noDataTaggedClass,
  noDataTaggedClassExamples
)

const value284 = namedCheck("no-instanceof", noInstanceof, noInstanceofExamples)

const value285 = namedCheck(
  "no-single-use-callee",
  noSingleUseCallee,
  noSingleUseCalleeExamples
)

const value286 = namedCheck(
  "prefer-hash-set",
  preferHashSet,
  preferHashSetExamples
)

const value287 = namedCheck(
  "prefer-hash-map",
  preferHashMap,
  preferHashMapExamples
)

const value288 = namedCheck(
  "prefer-option-match",
  preferOptionMatch,
  preferOptionMatchExamples
)

const value289 = namedCheck(
  "prefer-pipe-function",
  preferPipeFunction,
  preferPipeFunctionExamples
)

const value290 = silentCheck(
  "prefer-curried-data-last-functions",
  preferCurriedDataLastFunctions,
  preferCurriedDataLastFunctionsExamples
)

export const defaultChecks: ReadonlyArray<NamedCheck> = Array.make(
  value229,
  value230,
  value231,
  value232,
  value233,
  value234,
  value235,
  value236,
  value237,
  value238,
  value239,
  value240,
  value241,
  value242,
  value243,
  value244,
  value245,
  value246,
  value247,
  value248,
  value249,
  value250,
  value251,
  value252,
  value253,
  value254,
  value255,
  value256,
  value257,
  value258,
  value259,
  value260,
  value261,
  value262,
  value263,
  value264,
  value265,
  value266,
  value267,
  value268,
  value269,
  value270,
  value271,
  value272,
  value273,
  value274,
  value275,
  value276,
  value277,
  value278,
  value279,
  value280,
  value281,
  value282,
  value283,
  value284,
  value285,
  value286,
  value287,
  value288,
  value289,
  value290
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

  const values291 = Array.make(
    imperativeAdvice,
    launderingAdvice,
    pipelineAdvice
  )

  const specificAdviceStreams = Stream.fromIterable(values291)

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

    const values292 = Array.make(
      specificReplay,
      densityReplay,
      subsystemReplay,
      dominanceReplay,
      systemicAdvice
    )

    const outputAdviceStreams = Stream.fromIterable(values292)

    return pipe(outputAdviceStreams, Stream.flatten())
  })

  return pipe(materializedAdvice, Stream.unwrap)
}

export const defaultWiring: Wiring = {
  checks: defaultChecks,
  derive: defaultDerive
}
