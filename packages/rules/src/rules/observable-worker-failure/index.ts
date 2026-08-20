import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { foldAst } from "../../internal/sources/foldAst.js"

import { enclosingFunctionLike } from "../../internal/support/effectApi/enclosingFunctionLike.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { apiSubject } from "../../internal/builtins/effectQuality/apiSubject.js"

import { callIsEffectApi } from "../../internal/builtins/effectQuality/callIsEffectApi.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

const ignoreEffectNames = Array.make("ignore", "ignoreCause")

const loggerMethodNames = Array.make("log", "info", "warn", "error", "debug", "trace", "fatal")

const bareLoggerNames = Array.make("log", "info", "warn", "error", "debug", "trace")

const loggingCallNode = (current: ts.Node) => {
  const isCall = ts.isCallExpression(current)

  if (!isCall) {
    return isCall
  }

  const expression = unwrapTransparentExpression(current.expression)

  if (ts.isPropertyAccessExpression(expression)) {
    const receiver = unwrapTransparentExpression(expression.expression)
    const receiverName = ts.isIdentifier(receiver) ? receiver.text : ""
    const consoleLog = strictEqual("console")(receiverName)
    const loggerMethod = Array.contains(loggerMethodNames, expression.name.text)
    const consoleParts = Array.make(consoleLog, loggerMethod)
    const consoleLogger = Array.every(consoleParts, Boolean)
    const signals = Array.make(consoleLogger, loggerMethod)

    return Array.some(signals, Boolean)
  }

  const isIdentifier = ts.isIdentifier(expression)

  return isIdentifier ? Array.contains(bareLoggerNames, expression.text) : isIdentifier
}

const hasNearbyLogging = (node: ts.Node) => {
  const reducer = (found: boolean) => (current: ts.Node) => {
    const hasLogging = loggingCallNode(current)
    const signals = Array.make(found, hasLogging)

    return Array.some(signals, Boolean)
  }

  const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
    reducer(found)(current)
  )

  const scan = Function.flip(foldAst(uncurriedReducer))(false)

  return pipe(enclosingFunctionLike(node), Option.exists(scan))
}

const observableWorkerFailureCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const notIgnore = !callIsEffectApi(context.checker)("Effect")(ignoreEffectNames)(node)
    const nearbyLogging = hasNearbyLogging(node)
    const skip = Array.make(notIgnore, nearbyLogging)

    if (Array.some(skip, Boolean)) {
      return noSubjectMatches
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const observableWorkerFailureScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  observableWorkerFailureCandidates
)

export const observableWorkerFailure = makeRule("observable-worker-failure")(
  observableWorkerFailureScanner
)(
  fixedRuleMessage(
    "Make worker failures observable.",
    "Log expected item failures or make the skip policy explicit at the owning worker boundary."
  )
)
