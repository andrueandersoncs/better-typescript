import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Match, Option, Predicate, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { foldAst } from "../../internal/sources/foldAst.js"

import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"

import { apiSubject } from "../../internal/builtins/effectQuality/apiSubject.js"

import { backoffScheduleNames } from "../../internal/builtins/effectQuality/backoffScheduleNames.js"

import { callIsEffectApi } from "../../internal/builtins/effectQuality/callIsEffectApi.js"

import { retryEffectNames } from "../../internal/builtins/effectQuality/retryEffectNames.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

const expressionTreeHasEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (expression: ts.Expression) => {
    const apiAt = importedEffectApiAt(checker)(namespace)(names)
    const callExpressionApiAt = (call: ts.CallExpression) => apiAt(call.expression)

    const matchCurrent = (current: ts.Node) =>
      pipe(
        Match.value(current),
        Match.when(ts.isCallExpression, callExpressionApiAt),
        Match.when(ts.isPropertyAccessExpression, apiAt),
        Match.orElse(Function.constFalse)
      )

    const reducer = (found: boolean) => (current: ts.Node) => {
      const matchesCurrent = matchCurrent(current)
      const signals = Array.make(found, matchesCurrent)

      return Array.some(signals, Boolean)
    }

    const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      reducer(found)(current)
    )

    return foldAst(uncurriedReducer)(expression)(false)
  }

const jitterScheduleNames = Array.of("jittered")

const scheduleHasBackoff = (checker: ts.TypeChecker) =>
  expressionTreeHasEffectApi(checker)("Schedule")(backoffScheduleNames)

const scheduleHasJitter = (checker: ts.TypeChecker) =>
  expressionTreeHasEffectApi(checker)("Schedule")(jitterScheduleNames)

const retryScheduleArgument = (node: ts.CallExpression) => {
  const hasScheduleSlot = node.arguments.length >= 2
  const hasSingleArgument = strictEqual(1)(node.arguments.length)

  if (hasScheduleSlot) {
    return Option.fromNullishOr(node.arguments[1])
  }

  return hasSingleArgument ? Option.fromNullishOr(node.arguments[0]) : Option.none()
}

const retryWithoutJitterCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const isRetry = callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)

    if (!isRetry) {
      return noSubjectMatches
    }

    const subject = apiSubject(context)("Effect.retry")(node.expression)
    const finding = makeSubjectMatch(subject)(node.expression)

    return pipe(
      retryScheduleArgument(node),
      Option.filter(scheduleHasBackoff(context.checker)),
      Option.filter(Predicate.not(scheduleHasJitter(context.checker))),
      Option.map(Function.constant(finding)),
      Option.map(Array.of),
      Option.getOrElse(Function.constant(noSubjectMatches))
    )
  }

const retryWithoutJitterScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  retryWithoutJitterCandidates
)

export const retryWithoutJitter = makeRule("retry-without-jitter")(retryWithoutJitterScanner)(
  fixedRuleMessage(
    "Jitter exponential retry.",
    "Add Schedule.jittered to the bounded backoff schedule."
  )
)
