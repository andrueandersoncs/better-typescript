import { Array, Order, Struct } from "effect"
import type { Rule } from "@better-typescript/core/linter"
import { boundarySchemaDecode } from "./rules/boundary-schema-decode/index.js"
import { boundedRetrySchedule } from "./rules/bounded-retry-schedule/index.js"
import { cachePerRequest } from "./rules/cache-per-request/index.js"
import { cachePreference } from "./rules/cache-preference/index.js"
import { closedAbstraction } from "./rules/closed-abstraction/index.js"
import { configRefinedValues } from "./rules/config-refined-values/index.js"
import { duplicateShape } from "./rules/duplicate-shape/index.js"
import { effectFnName } from "./rules/effect-fn-name/index.js"
import { effectTestStyle } from "./rules/effect-test-style/index.js"
import { functionDerivedModel } from "./rules/function-derived-model/index.js"
import { globalConfigMutation } from "./rules/global-config-mutation/index.js"
import { handrolledTtlCache } from "./rules/handrolled-ttl-cache/index.js"
import { httpClientPreference } from "./rules/http-client-preference/index.js"
import { httpResponseValidation } from "./rules/http-response-validation/index.js"
import { httpStatusDecodeOrder } from "./rules/http-status-decode-order/index.js"
import { idempotentRetry } from "./rules/idempotent-retry/index.js"
import { inflightDedupeMap } from "./rules/inflight-dedupe-map/index.js"
import { layerForeverAcquisition } from "./rules/layer-forever-acquisition/index.js"
import { missingRationale } from "./rules/missing-rationale/index.js"
import { noAsyncFunctions } from "./rules/no-async-functions/index.js"
import { noBlankLinesBetweenSingleLineDeclarations } from "./rules/no-blank-lines-between-single-line-declarations/index.js"
import { noCallbacks } from "./rules/no-callbacks/index.js"
import { noDuplicateFunctionNames } from "./rules/no-duplicate-function-names/index.js"
import { noDuplicateIfBodies } from "./rules/no-duplicate-if-bodies/index.js"
import { noErrorType } from "./rules/no-error-type/index.js"
import { noExplicitAnyReturn } from "./rules/no-explicit-any-return/index.js"
import { noFirstPartySchemaDeclare } from "./rules/no-first-party-schema-declare/index.js"
import { noForInLoops } from "./rules/no-for-in-loops/index.js"
import { noForLoops } from "./rules/no-for-loops/index.js"
import { noForOfLoops } from "./rules/no-for-of-loops/index.js"
import { noFunctionKeyword } from "./rules/no-function-keyword/index.js"
import { noImmediateEffectSync } from "./rules/no-immediate-effect-sync/index.js"
import { noInlineBooleanExpressions } from "./rules/no-inline-boolean-expressions/index.js"
import { noInlineClosures } from "./rules/no-inline-closures/index.js"
import { noInstanceof } from "./rules/no-instanceof/index.js"
import { noManualTypeDispatch } from "./rules/no-manual-type-dispatch/index.js"
import { noMonomorphicStructGet } from "./rules/no-monomorphic-struct-get/index.js"
import { noMultipleBooleanOperators } from "./rules/no-multiple-boolean-operators/index.js"
import { noMutableArrayMethods } from "./rules/no-mutable-array-methods/index.js"
import { noMutableVariableDeclarations } from "./rules/no-mutable-variable-declarations/index.js"
import { noMutation } from "./rules/no-mutation/index.js"
import { noNestedCalls } from "./rules/no-nested-calls/index.js"
import { noNestedIfStatements } from "./rules/no-nested-if-statements/index.js"
import { noNewError } from "./rules/no-new-error/index.js"
import { noNonNullAssertion } from "./rules/no-non-null-assertion/index.js"
import { noPassThroughObjectWrappers } from "./rules/no-pass-through-object-wrappers/index.js"
import { noRawObjectTypes } from "./rules/no-raw-object-types/index.js"
import { noReexports } from "./rules/no-reexports/index.js"
import { noSwitchStatements } from "./rules/no-switch-statements/index.js"
import { noThrow } from "./rules/no-throw/index.js"
import { noTrivialEffectFn } from "./rules/no-trivial-effect-fn/index.js"
import { noTryCatch } from "./rules/no-try-catch/index.js"
import { noUndefined } from "./rules/no-undefined/index.js"
import { noUnsafeEffectApis } from "./rules/no-unsafe-effect-apis/index.js"
import { noUnused } from "./rules/no-unused/index.js"
import { noValueAliases } from "./rules/no-value-aliases/index.js"
import { noVoidFunctions } from "./rules/no-void-functions/index.js"
import { noWeakMap } from "./rules/no-weak-map/index.js"
import { observableWorkerFailure } from "./rules/observable-worker-failure/index.js"
import { parameterBag } from "./rules/parameter-bag/index.js"
import { passThroughConversion } from "./rules/pass-through-conversion/index.js"
import { preferComposedCallbacks } from "./rules/prefer-composed-callbacks/index.js"
import { preferConditionalReturn } from "./rules/prefer-conditional-return/index.js"
import { preferContextServiceClass } from "./rules/prefer-context-service-class/index.js"
import { preferCurriedDataLastFunctions } from "./rules/prefer-curried-data-last-functions/index.js"
import { preferDirectBooleanReturn } from "./rules/prefer-direct-boolean-return/index.js"
import { preferDirectYield } from "./rules/prefer-direct-yield/index.js"
import { preferEffectArray } from "./rules/prefer-effect-array/index.js"
import { preferEffectArrayAppendAll } from "./rules/prefer-effect-array-append-all/index.js"
import { preferEffectArrayCountBy } from "./rules/prefer-effect-array-count-by/index.js"
import { preferEffectFn } from "./rules/prefer-effect-fn/index.js"
import { preferEffectFunctionConstant } from "./rules/prefer-effect-function-constant/index.js"
import { preferEffectIndexAccess } from "./rules/prefer-effect-index-access/index.js"
import { preferEffectPropertyAccessors } from "./rules/prefer-effect-property-accessors/index.js"
import { preferEffectRecordFilterMap } from "./rules/prefer-effect-record-filter-map/index.js"
import { preferEffectSchemaConstructor } from "./rules/prefer-effect-schema-constructor/index.js"
import { preferEffectSchemaGuard } from "./rules/prefer-effect-schema-guard/index.js"
import { preferEffectSchemaIs } from "./rules/prefer-effect-schema-is/index.js"
import { preferEffectSchemaRecord } from "./rules/prefer-effect-schema-record/index.js"
import { preferEffectfulFunction } from "./rules/prefer-effectful-function/index.js"
import { preferEquivalenceStrictEqual } from "./rules/prefer-equivalence-strict-equal/index.js"
import { preferEtaReduction } from "./rules/prefer-eta-reduction/index.js"
import { preferFunctionComposition } from "./rules/prefer-function-composition/index.js"
import { preferFunctionFlip } from "./rules/prefer-function-flip/index.js"
import { preferHashMap } from "./rules/prefer-hash-map/index.js"
import { preferHashSet } from "./rules/prefer-hash-set/index.js"
import { preferImplicitReturn } from "./rules/prefer-implicit-return/index.js"
import { preferInferredTypes } from "./rules/prefer-inferred-types/index.js"
import { preferOptionMatch } from "./rules/prefer-option-match/index.js"
import { preferPipeFunction } from "./rules/prefer-pipe-function/index.js"
import { preferResultConceptNames } from "./rules/prefer-result-concept-names/index.js"
import { preferSchemaTaggedStruct } from "./rules/prefer-schema-tagged-struct/index.js"
import { preferSpecificOperationNames } from "./rules/prefer-specific-operation-names/index.js"
import { processEnvironment } from "./rules/process-environment/index.js"
import { productionSleepLoops } from "./rules/production-sleep-loops/index.js"
import { rawFetchAbortSignal } from "./rules/raw-fetch-abort-signal/index.js"
import { rawFetchOutsideAdapter } from "./rules/raw-fetch-outside-adapter/index.js"
import { redundantAlias } from "./rules/redundant-alias/index.js"
import { requireBecauseInComments } from "./rules/require-because-in-comments/index.js"
import { requireBlankLinesAroundMultilineDeclarations } from "./rules/require-blank-lines-around-multiline-declarations/index.js"
import { requireCallableRoleNameConsistency } from "./rules/require-callable-role-name-consistency/index.js"
import { requireCommandNameConsistency } from "./rules/require-command-name-consistency/index.js"
import { requireConstructionNameConsistency } from "./rules/require-construction-name-consistency/index.js"
import { requireConversionDirectionConsistency } from "./rules/require-conversion-direction-consistency/index.js"
import { requireLookupTotalityNameConsistency } from "./rules/require-lookup-totality-name-consistency/index.js"
import { requirePredicateNameConsistency } from "./rules/require-predicate-name-consistency/index.js"
import { requireResultCardinalityNameConsistency } from "./rules/require-result-cardinality-name-consistency/index.js"
import { requireResultShapeNameConsistency } from "./rules/require-result-shape-name-consistency/index.js"
import { retryWithoutJitter } from "./rules/retry-without-jitter/index.js"
import { schemaClassModels } from "./rules/schema-class-models/index.js"
import { schemaErrorClass } from "./rules/schema-error-class/index.js"
import { schemaOptionalKey } from "./rules/schema-optional-key/index.js"
import { schemaRecordInterface } from "./rules/schema-record-interface/index.js"
import { scopedBackgroundWork } from "./rules/scoped-background-work/index.js"
import { scopedClientCache } from "./rules/scoped-client-cache/index.js"
import { serviceMethodEffectFn } from "./rules/service-method-effect-fn/index.js"
import { speculativeExport } from "./rules/speculative-export/index.js"
import { streamPagination } from "./rules/stream-pagination/index.js"
import { testClockForTime } from "./rules/test-clock-for-time/index.js"
import { testSleeps } from "./rules/test-sleeps/index.js"
import { typedBoundaryError } from "./rules/typed-boundary-error/index.js"
import { typedErrorRecovery } from "./rules/typed-error-recovery/index.js"
import { typescriptNamespaces } from "./rules/typescript-namespaces/index.js"
import { unboundedStreamBuffer } from "./rules/unbounded-stream-buffer/index.js"
import { unboundedStreamCollect } from "./rules/unbounded-stream-collect/index.js"
import { unsafeCasts } from "./rules/unsafe-casts/index.js"
import { unusedField } from "./rules/unused-field/index.js"

const allRules: ReadonlyArray<Rule> = Array.make(
  boundarySchemaDecode,
  boundedRetrySchedule,
  cachePerRequest,
  cachePreference,
  closedAbstraction,
  configRefinedValues,
  duplicateShape,
  effectFnName,
  effectTestStyle,
  functionDerivedModel,
  globalConfigMutation,
  handrolledTtlCache,
  httpClientPreference,
  httpResponseValidation,
  httpStatusDecodeOrder,
  idempotentRetry,
  inflightDedupeMap,
  layerForeverAcquisition,
  missingRationale,
  noAsyncFunctions,
  noBlankLinesBetweenSingleLineDeclarations,
  noCallbacks,
  noDuplicateFunctionNames,
  noDuplicateIfBodies,
  noErrorType,
  noExplicitAnyReturn,
  noFirstPartySchemaDeclare,
  noForInLoops,
  noForLoops,
  noForOfLoops,
  noFunctionKeyword,
  noImmediateEffectSync,
  noInlineBooleanExpressions,
  noInlineClosures,
  noInstanceof,
  noManualTypeDispatch,
  noMonomorphicStructGet,
  noMultipleBooleanOperators,
  noMutableArrayMethods,
  noMutableVariableDeclarations,
  noMutation,
  noNestedCalls,
  noNestedIfStatements,
  noNewError,
  noNonNullAssertion,
  noPassThroughObjectWrappers,
  noRawObjectTypes,
  noReexports,
  noSwitchStatements,
  noThrow,
  noTrivialEffectFn,
  noTryCatch,
  noUndefined,
  noUnsafeEffectApis,
  noUnused,
  noValueAliases,
  noVoidFunctions,
  noWeakMap,
  observableWorkerFailure,
  parameterBag,
  passThroughConversion,
  preferComposedCallbacks,
  preferConditionalReturn,
  preferContextServiceClass,
  preferCurriedDataLastFunctions,
  preferDirectBooleanReturn,
  preferDirectYield,
  preferEffectArray,
  preferEffectArrayAppendAll,
  preferEffectArrayCountBy,
  preferEffectFn,
  preferEffectFunctionConstant,
  preferEffectIndexAccess,
  preferEffectPropertyAccessors,
  preferEffectRecordFilterMap,
  preferEffectSchemaConstructor,
  preferEffectSchemaGuard,
  preferEffectSchemaIs,
  preferEffectSchemaRecord,
  preferEffectfulFunction,
  preferEquivalenceStrictEqual,
  preferEtaReduction,
  preferFunctionComposition,
  preferFunctionFlip,
  preferHashMap,
  preferHashSet,
  preferImplicitReturn,
  preferInferredTypes,
  preferOptionMatch,
  preferPipeFunction,
  preferResultConceptNames,
  preferSchemaTaggedStruct,
  preferSpecificOperationNames,
  processEnvironment,
  productionSleepLoops,
  rawFetchAbortSignal,
  rawFetchOutsideAdapter,
  redundantAlias,
  requireBecauseInComments,
  requireBlankLinesAroundMultilineDeclarations,
  requireCallableRoleNameConsistency,
  requireCommandNameConsistency,
  requireConstructionNameConsistency,
  requireConversionDirectionConsistency,
  requireLookupTotalityNameConsistency,
  requirePredicateNameConsistency,
  requireResultCardinalityNameConsistency,
  requireResultShapeNameConsistency,
  retryWithoutJitter,
  schemaClassModels,
  schemaErrorClass,
  schemaOptionalKey,
  schemaRecordInterface,
  scopedBackgroundWork,
  scopedClientCache,
  serviceMethodEffectFn,
  speculativeExport,
  streamPagination,
  testClockForTime,
  testSleeps,
  typedBoundaryError,
  typedErrorRecovery,
  typescriptNamespaces,
  unboundedStreamBuffer,
  unboundedStreamCollect,
  unsafeCasts,
  unusedField
)

const ruleName = Struct.get<Rule, "name">("name")
const ruleOrder = Order.mapInput<string, Rule>(Order.String, ruleName)

export const builtinRules: ReadonlyArray<Rule> = Array.sort(allRules, ruleOrder)
