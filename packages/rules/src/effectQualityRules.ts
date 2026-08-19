import { Array } from "effect"
import { unsafeCasts, typescriptNamespaces } from "./internal/builtins/effectQuality/syntaxRules.js"
import {
  schemaClassModels,
  schemaRecordInterface,
  schemaOptionalKey,
  schemaErrorClass,
  boundarySchemaDecode
} from "./internal/builtins/effectQuality/schemaRules.js"
import {
  serviceMethodEffectFn,
  effectFnName
} from "./internal/builtins/effectQuality/serviceRules.js"
import {
  rawFetchAbortSignal,
  httpResponseValidation,
  httpStatusDecodeOrder,
  rawFetchOutsideAdapter,
  httpClientPreference
} from "./internal/builtins/effectQuality/httpRules.js"
import { effectTestStyle } from "./internal/builtins/effectQuality/effectTestRules.js"
import { configRefinedValues } from "./internal/builtins/effectQuality/configRules.js"
import {
  idempotentRetry,
  retryWithoutJitter
} from "./internal/builtins/effectQuality/retryRules.js"
import {
  testSleeps,
  productionSleepLoops,
  boundedRetrySchedule,
  testClockForTime
} from "./internal/builtins/effectQuality/timeAndRetryRules.js"
import {
  unboundedStreamCollect,
  unboundedStreamBuffer,
  layerForeverAcquisition,
  scopedBackgroundWork,
  observableWorkerFailure,
  streamPagination
} from "./internal/builtins/effectQuality/streamAndWorkerRules.js"
import {
  handrolledTtlCache,
  inflightDedupeMap,
  cachePerRequest,
  scopedClientCache,
  cachePreference
} from "./internal/builtins/effectQuality/cacheRules.js"
import {
  typedErrorRecovery,
  typedBoundaryError
} from "./internal/builtins/effectQuality/errorRecoveryRules.js"
import { globalConfigMutation } from "./internal/builtins/effectQuality/environmentMutationRules.js"
import { processEnvironment } from "./internal/builtins/processEnvironment.js"

export const effectQualityRules = Array.make(
  unsafeCasts,
  schemaClassModels,
  typescriptNamespaces,
  serviceMethodEffectFn,
  effectFnName,
  schemaRecordInterface,
  schemaOptionalKey,
  schemaErrorClass,
  rawFetchAbortSignal,
  httpResponseValidation,
  httpStatusDecodeOrder,
  effectTestStyle,
  configRefinedValues,
  retryWithoutJitter,
  rawFetchOutsideAdapter,
  httpClientPreference,
  boundarySchemaDecode,
  idempotentRetry,
  processEnvironment,
  testSleeps,
  productionSleepLoops,
  unboundedStreamCollect,
  unboundedStreamBuffer,
  handrolledTtlCache,
  inflightDedupeMap,
  cachePerRequest,
  scopedClientCache,
  typedErrorRecovery,
  layerForeverAcquisition,
  globalConfigMutation,
  boundedRetrySchedule,
  testClockForTime,
  scopedBackgroundWork,
  observableWorkerFailure,
  cachePreference,
  streamPagination,
  typedBoundaryError
)
