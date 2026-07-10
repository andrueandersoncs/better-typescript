import { Effect, Stream, pipe } from "effect"
import {
  highSignalDensity,
  hotSubsystem,
  imperativeStateManager,
  pipelineHostile,
  ruleDominance,
  sideEffectLaundering,
  systemicHotspots
} from "../advice/index.js"
import { preferCurriedDataLastFunctions } from "../advice/preferCurriedDataLastFunctions.js"
import {
  namedRuleCheck,
  ruleSignal,
  withFallbackAdvice
} from "../detectors/report.js"
import type {
  NamedRuleCheck,
  ReportWiring,
  RuleSignals
} from "../detectors/report.js"
import { collectSignals, namedDetection } from "../detectors/summary.js"
import type {
  AdviceElement,
  NamedDetection
} from "../detectors/summary.js"
import {
  noAbstractClasses,
  noArraySpread,
  noAsyncFunctions,
  noCallbacks,
  noClassMethodImplementations,
  noDataTaggedClass,
  noDuplicateFunctionNames,
  noDuplicateIfBodies,
  noExplicitAnyReturn,
  noFirstPartySchemaDeclare,
  noForInLoops,
  noForLoops,
  noForOfLoops,
  noFunctionKeyword,
  noInlineBooleanExpressions,
  noInlineClosures,
  noInstanceof,
  noManualTypeDispatch,
  noMultiLineComments,
  noMultipleBooleanOperators,
  noMutableArrayMethods,
  noMutableVariableDeclarations,
  noMutation,
  noNestedCalls,
  noNestedIfStatements,
  noNewError,
  noNonNullAssertion,
  noRawObjectTypes,
  noRootLevelClasses,
  noSingleUseCallee,
  noSwitchStatements,
  noThrow,
  noTryCatch,
  noUndefined,
  noVoidFunctions,
  preferConditionalReturn,
  preferDataLastModule,
  preferDirectBooleanReturn,
  preferEffectArrayAppendAll,
  preferEffectFn,
  preferEffectPropertyAccessors,
  preferEffectRecordFilterMap,
  preferEffectSchemaClass,
  preferEffectSchemaConstructor,
  preferEffectSchemaGuard,
  preferEffectSchemaIs,
  preferHashMap,
  preferHashSet,
  preferImplicitReturn,
  preferOptionMatch,
  preferPipeFunction
} from "../rules/index.js"

const highSignalDensityTitle = "high signal density"

const nameDetections = (
  rule: RuleSignals
): Stream.Stream<NamedDetection, Error> => {
  const toNamedDetection = namedDetection(rule.name)

  return Stream.map(rule.elements, toNamedDetection)
}

const isHighSignalDensityAdvice = (advice: AdviceElement): boolean =>
  advice.title === highSignalDensityTitle

const replayAdvice = (
  advice: ReadonlyArray<AdviceElement>
): Stream.Stream<AdviceElement, Error> => Stream.fromIterable(advice)

export const reportedRules: ReadonlyArray<NamedRuleCheck> = [
  namedRuleCheck("prefer-effect-schema-guard", preferEffectSchemaGuard),
  namedRuleCheck("prefer-effect-schema-is", preferEffectSchemaIs),
  namedRuleCheck(
    "prefer-effect-schema-constructor",
    preferEffectSchemaConstructor
  ),
  namedRuleCheck("prefer-effect-schema-class", preferEffectSchemaClass),
  namedRuleCheck("prefer-effect-fn", preferEffectFn),
  namedRuleCheck(
    "prefer-effect-property-accessors",
    preferEffectPropertyAccessors
  ),
  namedRuleCheck(
    "prefer-effect-record-filter-map",
    preferEffectRecordFilterMap
  ),
  namedRuleCheck("prefer-effect-array-append-all", preferEffectArrayAppendAll),
  namedRuleCheck("prefer-data-last-module", preferDataLastModule),
  namedRuleCheck("prefer-conditional-return", preferConditionalReturn),
  namedRuleCheck("prefer-direct-boolean-return", preferDirectBooleanReturn),
  namedRuleCheck("prefer-implicit-return", preferImplicitReturn),
  namedRuleCheck("no-throw", noThrow),
  namedRuleCheck("no-new-error", noNewError),
  namedRuleCheck("no-try-catch", noTryCatch),
  namedRuleCheck("no-undefined", noUndefined),
  namedRuleCheck("no-void-functions", noVoidFunctions),
  namedRuleCheck("no-root-level-classes", noRootLevelClasses),
  namedRuleCheck("no-multi-line-comments", noMultiLineComments),
  namedRuleCheck("no-explicit-any-return", noExplicitAnyReturn),
  namedRuleCheck("no-multiple-boolean-operators", noMultipleBooleanOperators),
  namedRuleCheck("no-inline-boolean-expressions", noInlineBooleanExpressions),
  namedRuleCheck("no-mutable-array-methods", noMutableArrayMethods),
  namedRuleCheck(
    "no-mutable-variable-declarations",
    noMutableVariableDeclarations
  ),
  namedRuleCheck("no-mutation", noMutation),
  namedRuleCheck("no-nested-if-statements", noNestedIfStatements),
  namedRuleCheck("no-non-null-assertion", noNonNullAssertion),
  namedRuleCheck("no-duplicate-if-bodies", noDuplicateIfBodies),
  namedRuleCheck("no-duplicate-function-names", noDuplicateFunctionNames),
  namedRuleCheck("no-callbacks", noCallbacks),
  namedRuleCheck("no-async-functions", noAsyncFunctions),
  namedRuleCheck("no-array-spread", noArraySpread),
  namedRuleCheck("no-for-in-loops", noForInLoops),
  namedRuleCheck("no-for-loops", noForLoops),
  namedRuleCheck("no-for-of-loops", noForOfLoops),
  namedRuleCheck("no-switch-statements", noSwitchStatements),
  namedRuleCheck("no-function-keyword", noFunctionKeyword),
  namedRuleCheck("no-inline-closures", noInlineClosures),
  namedRuleCheck("no-nested-calls", noNestedCalls),
  namedRuleCheck("no-manual-type-dispatch", noManualTypeDispatch),
  namedRuleCheck("no-abstract-classes", noAbstractClasses),
  namedRuleCheck(
    "no-class-method-implementations",
    noClassMethodImplementations
  ),
  namedRuleCheck("no-raw-object-types", noRawObjectTypes),
  namedRuleCheck("no-first-party-schema-declare", noFirstPartySchemaDeclare),
  namedRuleCheck("no-data-tagged-class", noDataTaggedClass),
  namedRuleCheck("no-instanceof", noInstanceof),
  namedRuleCheck("no-single-use-callee", noSingleUseCallee),
  namedRuleCheck("prefer-hash-set", preferHashSet),
  namedRuleCheck("prefer-hash-map", preferHashMap),
  namedRuleCheck("prefer-option-match", preferOptionMatch),
  namedRuleCheck("prefer-pipe-function", preferPipeFunction)
]

export const helperRules: ReadonlyArray<NamedRuleCheck> = [
  namedRuleCheck(
    "prefer-curried-data-last-functions",
    preferCurriedDataLastFunctions
  )
]

export const defaultAdvice = (
  ruleSignals: ReadonlyArray<RuleSignals>,
  helperSignals: ReadonlyArray<RuleSignals>
): Stream.Stream<AdviceElement, Error> => {
  const elementsOf = ruleSignal(ruleSignals)
  const helperElementsOf = ruleSignal(helperSignals)
  const ruleSignalStream = Stream.fromIterable(ruleSignals)
  const namedElements = pipe(ruleSignalStream, Stream.flatMap(nameDetections))
  const noMutation = elementsOf("no-mutation")
  const preferHashMap = elementsOf("prefer-hash-map")
  const preferHashSet = elementsOf("prefer-hash-set")
  const noMutableArrayMethods = elementsOf("no-mutable-array-methods")
  const noMutableVariableDeclarations = elementsOf(
    "no-mutable-variable-declarations"
  )
  const noNestedCalls = elementsOf("no-nested-calls")
  const preferCurried = helperElementsOf("prefer-curried-data-last-functions")
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
    const specificWithFallbackAdvice = withFallbackAdvice(
      specificAdvice,
      densityAdvice
    )
    const densityAwareAdviceEffect = collectSignals(specificWithFallbackAdvice)
    const subsystemAdviceEffect = collectSignals(subsystemAdvice)
    const dominanceAdviceEffect = collectSignals(dominanceAdvice)
    const densityAwareAdvice = yield* densityAwareAdviceEffect
    const subsystemAdviceElements = yield* subsystemAdviceEffect
    const dominanceAdviceElements = yield* dominanceAdviceEffect
    const highSignalDensityOnlyAdvice = densityAwareAdvice.filter(
      isHighSignalDensityAdvice
    )
    const densityAwareReplay = replayAdvice(densityAwareAdvice)
    const subsystemReplay = replayAdvice(subsystemAdviceElements)
    const dominanceReplay = replayAdvice(dominanceAdviceElements)
    const highSignalDensityReplay = replayAdvice(highSignalDensityOnlyAdvice)
    const systemicInput = {
      hotSubsystem: subsystemReplay,
      highSignalDensity: highSignalDensityReplay
    }
    const systemicAdvice = systemicHotspots(systemicInput)
    const outputAdviceStreams = Stream.fromIterable([
      densityAwareReplay,
      subsystemReplay,
      dominanceReplay,
      systemicAdvice
    ])

    return pipe(outputAdviceStreams, Stream.flatten())
  })

  return pipe(materializedAdvice, Stream.unwrap)
}

export const defaultWiring: ReportWiring = {
  rules: reportedRules,
  helpers: helperRules,
  advice: defaultAdvice
}
