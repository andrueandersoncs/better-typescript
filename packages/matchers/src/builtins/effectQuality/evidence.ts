import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import { callExpressionOf } from "../../support/tsNode.js"
import { roleForSourceFile } from "./index.js"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import { emptyAdviceFindings } from "./makeFindings.js"
import type { ArchitectureRole } from "../../support/architectureRole.js"
import { configRefinedValues, retryWithoutJitter, idempotentRetry } from "./evidenceConfigRetry.js"
import { rawFetchOutsideAdapter, httpClientPreference } from "./evidenceRawFetch.js"
import { thinHttpHandlers, transactionNetworkWork } from "./evidenceHttpHandlers.js"
import { boundarySchemaDecode } from "./evidenceBoundaryDecode.js"
import { testLiveRuntime, testClockForTime } from "./evidenceTestRuntime.js"
import { layerAuthorityVisibility, layerComposition } from "./evidenceLayers.js"
import {
  scopedBackgroundWork,
  observableWorkerFailure,
  keyedStreamWork
} from "./evidenceWorkers.js"
import { cachePreference } from "./evidenceCache.js"
import { streamPagination } from "./evidenceStreamPagination.js"
import { publicQueue } from "./evidencePublicQueue.js"
import { typedBoundaryError } from "./evidenceTypedBoundary.js"

const callAdviceFindings =
  (context: MatchContext) =>
  (index: EffectQualityIndex) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression) => {
    const configFindings = configRefinedValues(context)(role)(node)
    const retryFindings = retryWithoutJitter(context)(role)(node)
    const rawFetchFindings = rawFetchOutsideAdapter(context)(index)(role)(node)
    const liveRuntimeFindings = testLiveRuntime(role)(node)
    const clockFindings = testClockForTime(context)(role)(node)
    const thinHandlerFindings = thinHttpHandlers(context)(role)(node)
    const transactionFindings = transactionNetworkWork(context)(role)(node)
    const authorityFindings = layerAuthorityVisibility(context)(role)(node)
    const compositionFindings = layerComposition(context)(role)(node)
    const scopedFindings = scopedBackgroundWork(context)(role)(node)
    const cacheFindings = cachePreference(context)(role)(node)
    const queueFindings = publicQueue(context)(role)(node)
    const keyedFindings = keyedStreamWork(context)(role)(node)
    const typedBoundaryFindings = typedBoundaryError(context)(role)(node)
    const schemaDecodeFindings = boundarySchemaDecode(context)(role)(node)
    const idempotentFindings = idempotentRetry(context)(index)(role)(node)
    const workerFailureFindings = observableWorkerFailure(context)(role)(node)
    const httpClientFindings = httpClientPreference(context)(index)(role)(node)

    const collectors = Array.make(
      configFindings,
      retryFindings,
      rawFetchFindings,
      liveRuntimeFindings,
      clockFindings,
      thinHandlerFindings,
      transactionFindings,
      authorityFindings,
      compositionFindings,
      scopedFindings,
      cacheFindings,
      queueFindings,
      keyedFindings,
      typedBoundaryFindings,
      schemaDecodeFindings,
      idempotentFindings,
      workerFailureFindings,
      httpClientFindings
    )

    return Array.flatten(collectors)
  }

const newExpressionAdviceFindings =
  (context: MatchContext) => (role: ArchitectureRole) => (node: ts.NewExpression) => {
    const cacheFindings = cachePreference(context)(role)(node)
    const keyedFindings = keyedStreamWork(context)(role)(node)

    return Array.appendAll(cacheFindings, keyedFindings)
  }

const nodeAdviceFindings =
  (context: MatchContext) =>
  (index: EffectQualityIndex) =>
  (role: ArchitectureRole) =>
  (node: ts.Node) => {
    const fromCalls = pipe(
      callExpressionOf(node),
      Option.map(callAdviceFindings(context)(index)(role)),
      Option.getOrElse(Function.constant(emptyAdviceFindings))
    )

    const fromNew = ts.isNewExpression(node)
      ? newExpressionAdviceFindings(context)(role)(node)
      : emptyAdviceFindings

    const fromLoops = streamPagination(context)(role)(node)
    const fromDeclarations = publicQueue(context)(role)(node)
    const groups = Array.make(fromCalls, fromNew, fromLoops, fromDeclarations)

    return Array.flatten(groups)
  }

export const effectQualityAdviceFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityAdviceFinding> => {
  const role = roleForSourceFile(index, context.sourceFile)
  const findingsForRole = nodeAdviceFindings(context)(index)

  return Option.match(role, {
    onNone: Function.constant(emptyAdviceFindings),
    onSome: Function.flip(findingsForRole)(node)
  })
}
