import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Match as EffectMatch, Function, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { foldAst } from "../../internal/sources/foldAst.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { apiSubject } from "../../internal/builtins/effectQuality/apiSubject.js"

import { callIsEffectApi } from "../../internal/builtins/effectQuality/callIsEffectApi.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

import { catchCauseNames } from "../../internal/builtins/effectQuality/errorRecoveryRulesShared.js"

const catchAllNames = Array.make("catchAll", "catchAllDefect")

const failNames = Array.make("fail", "failSync")

const domainErrorPattern = /Error|Fail|Fault|Defect|Tagged/i

const builtinErrorPattern = /^(Error|TypeError|RangeError)$/

const newExpressionCalleeText = (expression: ts.NewExpression) =>
  pipe(expression.expression.getText(), Option.some)

const callExpressionCalleeText = (expression: ts.CallExpression) =>
  pipe(expression.expression.getText(), Option.some)

const constructionTextOf = (current: ts.Node) =>
  pipe(
    EffectMatch.value(current),
    EffectMatch.when(ts.isNewExpression, newExpressionCalleeText),
    EffectMatch.when(ts.isCallExpression, callExpressionCalleeText),
    EffectMatch.orElse(() => Option.none())
  )

const isTaggedDomainConstruction = (text: string) => {
  const looksDomain = domainErrorPattern.test(text)
  const isBuiltin = builtinErrorPattern.test(text)
  const notBuiltin = !isBuiltin
  const checks = Array.make(looksDomain, notBuiltin)

  return Array.every(checks, Boolean)
}

const isRawErrorConstruction = (expression: ts.NewExpression) => {
  const callee = unwrapTransparentExpression(expression.expression)
  const isIdentifier = ts.isIdentifier(callee)
  const calleeText = isIdentifier ? callee.text : ""
  const isErrorName = strictEqual("Error")(calleeText)
  const checks = Array.make(isIdentifier, isErrorName)

  return Array.every(checks, Boolean)
}

const typedBoundaryErrorCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const catchAllCall = callIsEffectApi(context.checker)("Effect")(catchAllNames)(node)
    const catchCauseCall = callIsEffectApi(context.checker)("Effect")(catchCauseNames)(node)
    const catchAllParts = Array.make(catchAllCall, catchCauseCall)
    const catchAll = Array.some(catchAllParts, Boolean)

    if (!catchAll) {
      return noSubjectMatches
    }

    const handlerOption = pipe(
      Option.fromNullishOr(node.arguments[1]),
      Option.orElse(() => Option.fromNullishOr(node.arguments[0]))
    )

    if (Option.isNone(handlerOption)) {
      return noSubjectMatches
    }

    // Stay quiet when the handler already because mapping is present.
    const mapsTaggedErrorStep = (found: boolean) => (current: ts.Node) => {
      const taggedConstruction = pipe(
        constructionTextOf(current),
        Option.exists(isTaggedDomainConstruction)
      )

      const failConstruction = pipe(
        Option.liftPredicate(ts.isCallExpression)(current),
        Option.exists(callIsEffectApi(context.checker)("Effect")(failNames))
      )

      const signals = Array.make(found, taggedConstruction, failConstruction)

      return Array.some(signals, Boolean)
    }

    const uncurriedMapsTaggedErrorStep = Function.untupled(
      ([found, current]: readonly [boolean, ts.Node]) => mapsTaggedErrorStep(found)(current)
    )

    const mapsTaggedError = foldAst(uncurriedMapsTaggedErrorStep)(handlerOption.value)(false)

    // Only flag handlers that rethrow or return raw Error because that skips domain mapping.
    const returnsRawErrorStep = (found: boolean) => (current: ts.Node) => {
      const rawError = pipe(
        EffectMatch.value(current),
        EffectMatch.when(ts.isThrowStatement, Function.constTrue),
        EffectMatch.when(ts.isNewExpression, isRawErrorConstruction),
        EffectMatch.orElse(Function.constFalse)
      )

      const signals = Array.make(found, rawError)

      return Array.some(signals, Boolean)
    }

    const uncurriedReturnsRawErrorStep = Function.untupled(
      ([found, current]: readonly [boolean, ts.Node]) => returnsRawErrorStep(found)(current)
    )

    const returnsRawError = foldAst(uncurriedReturnsRawErrorStep)(handlerOption.value)(false)
    const mapsWithoutRawParts = Array.make(mapsTaggedError, !returnsRawError)
    const mapsWithoutRaw = Array.every(mapsWithoutRawParts, Boolean)
    const quiet = Array.make(mapsWithoutRaw, !returnsRawError)

    if (Array.some(quiet, Boolean)) {
      return noSubjectMatches
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const typedBoundaryErrorScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  typedBoundaryErrorCandidates
)

export const typedBoundaryError = makeRule("typed-boundary-error")(typedBoundaryErrorScanner)(
  fixedRuleMessage(
    "Map boundary failures to typed domain errors.",
    "Translate infrastructure failures at the adapter seam into an operation-labelled domain error."
  )
)
