import { Array } from "effect"
import { collectFindings } from "../../support/collectFindings.js"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import type * as ts from "typescript"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { processEnvironmentFindings, globalConfigMutationFindings } from "./reportedRuntimeEnv.js"
import { testSleepFindings, productionSleepLoopFindings } from "./reportedRuntimeSleep.js"
import { boundedRetryScheduleFindings } from "./reportedRuntimeRetry.js"
import {
  unboundedStreamCollectFindings,
  unboundedStreamBufferFindings
} from "./reportedRuntimeStream.js"
import {
  handrolledTtlCacheFindings,
  inflightDedupeMapFindings
} from "./reportedRuntimeHandrolledCache.js"
import {
  cachePerRequestFindings,
  scopedClientCacheFindings
} from "./reportedRuntimeCacheLifecycle.js"
import { typedErrorRecoveryFindings } from "./reportedRuntimeTypedError.js"
import { layerForeverAcquisitionFindings } from "./reportedRuntimeLayerForever.js"

const collectors: ReadonlyArray<
  (
    context: MatchContext,
    index: EffectQualityIndex,
    node: ts.Node
  ) => ReadonlyArray<EffectQualityRuleFinding>
> = Array.make(
  processEnvironmentFindings,
  testSleepFindings,
  productionSleepLoopFindings,
  unboundedStreamCollectFindings,
  unboundedStreamBufferFindings,
  handrolledTtlCacheFindings,
  inflightDedupeMapFindings,
  cachePerRequestFindings,
  scopedClientCacheFindings,
  typedErrorRecoveryFindings,
  layerForeverAcquisitionFindings,
  globalConfigMutationFindings,
  boundedRetryScheduleFindings
)

export const runtimeRuleFindings = collectFindings(collectors)
