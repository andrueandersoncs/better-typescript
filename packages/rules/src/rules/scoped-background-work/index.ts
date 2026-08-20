import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { hasEffectCallAncestor } from "../../internal/support/effectApi/hasEffectCallAncestor.js"

import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"

import { ancestorMatching } from "./ancestorMatching.js"

import { apiSubject } from "../../internal/builtins/effectQuality/apiSubject.js"

import { callIsEffectApi } from "../../internal/builtins/effectQuality/callIsEffectApi.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

const cacheMakeNames = Array.make("make", "makeWith")

const foreverEffectNames = Array.of("forever")

const scopedForkNames = Array.make("forkScoped", "forkIn")

const unscopedForkNames = Array.make("forkChild", "forkDetach", "forkDaemon")

const layerEffectNames = Array.make("effect", "effectDiscard", "scoped", "scopedDiscard")

const fiberSetRunNames = Array.make("run", "add", "makeRuntime")

const fiberMapRunNames = Array.make("run", "set", "makeRuntime")

const fiberCollectionSignals = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const fiberSet = importedEffectApiAt(checker)("FiberSet")(cacheMakeNames)(call.expression)
  const fiberMap = importedEffectApiAt(checker)("FiberMap")(cacheMakeNames)(call.expression)
  const fiberSetRun = importedEffectApiAt(checker)("FiberSet")(fiberSetRunNames)(call.expression)
  const fiberMapRun = importedEffectApiAt(checker)("FiberMap")(fiberMapRunNames)(call.expression)

  return Array.make(fiberSet, fiberMap, fiberSetRun, fiberMapRun)
}

const hasScopedBackgroundAncestor = (checker: ts.TypeChecker) => (node: ts.Node) => {
  const forkScoped = hasEffectCallAncestor(checker)("Effect")(scopedForkNames)(node)

  const fiberCollection = pipe(
    ancestorMatching(ts.isCallExpression)(node),
    Option.exists((call) => {
      const signals = fiberCollectionSignals(checker)(call)

      return Array.some(signals, Boolean)
    })
  )

  const signals = Array.make(forkScoped, fiberCollection)

  return Array.some(signals, Boolean)
}

const isLayerAcquisitionContext = (checker: ts.TypeChecker) =>
  hasEffectCallAncestor(checker)("Layer")(layerEffectNames)

const streamRunForeverNames = Array.make("runForEach", "runDrain", "runFold")

const scopedBackgroundWorkCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const layerAcquisition = isLayerAcquisitionContext(context.checker)(node)

    if (layerAcquisition) {
      return noSubjectMatches
    }

    const forever = callIsEffectApi(context.checker)("Effect")(foreverEffectNames)(node)
    const unscopedFork = callIsEffectApi(context.checker)("Effect")(unscopedForkNames)(node)
    const streamRun = callIsEffectApi(context.checker)("Stream")(streamRunForeverNames)(node)
    const underForever = hasEffectCallAncestor(context.checker)("Effect")(foreverEffectNames)(node)
    const streamRunForeverParts = Array.make(streamRun, underForever)
    const streamRunForever = Array.every(streamRunForeverParts, Boolean)
    const candidates = Array.make(forever, unscopedFork, streamRunForever)
    const hasCandidate = Array.some(candidates, Boolean)
    const scopedAncestor = hasScopedBackgroundAncestor(context.checker)(node)
    const quiet = Array.make(!hasCandidate, scopedAncestor)

    if (Array.some(quiet, Boolean)) {
      return noSubjectMatches
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const scopedBackgroundWorkScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  scopedBackgroundWorkCandidates
)

export const scopedBackgroundWork = makeRule("scoped-background-work")(scopedBackgroundWorkScanner)(
  fixedRuleMessage(
    "Scope background work.",
    "Own worker lifetime in a Layer and fork it into that scope."
  )
)
