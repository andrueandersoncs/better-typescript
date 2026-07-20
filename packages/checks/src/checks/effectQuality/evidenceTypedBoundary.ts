import { Array, Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import { apiSubject, callIsEffectApi } from "./evidenceSupport.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const catchCauseNames = Array.make("catchCause", "catchAllCause")

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
    Match.value(current),
    Match.when(ts.isNewExpression, newExpressionCalleeText),
    Match.when(ts.isCallExpression, callExpressionCalleeText),
    Match.orElse(() => Option.none())
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
  const isErrorName = strictEqual(calleeText, "Error")
  const checks = Array.make(isIdentifier, isErrorName)

  return Array.every(checks, Boolean)
}

export const typedBoundaryError =
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    // Map adapter/app failures to domain errors because callers need typed boundaries.
    const isAdapter = strictEqual(role, "adapter")
    const isApplication = strictEqual(role, "application")
    const allowed = Array.make(isAdapter, isApplication)

    if (!Array.some(allowed, Boolean)) {
      return emptyAdviceFindings
    }

    const catchAllCall = callIsEffectApi(context.checker)("Effect")(catchAllNames)(node)
    const catchCauseCall = callIsEffectApi(context.checker)("Effect")(catchCauseNames)(node)
    const catchAllParts = Array.make(catchAllCall, catchCauseCall)
    const catchAll = Array.some(catchAllParts, Boolean)

    if (!catchAll) {
      return emptyAdviceFindings
    }

    const handlerOption = pipe(
      Option.fromNullishOr(node.arguments[1]),
      Option.orElse(() => Option.fromNullishOr(node.arguments[0]))
    )

    if (Option.isNone(handlerOption)) {
      return emptyAdviceFindings
    }

    const handler = handlerOption.value

    // Stay quiet when the handler already constructs a tagged domain error because mapping is present.
    const mapsTaggedErrorReducer = (found: boolean, current: ts.Node) => {
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

    const mapsTaggedError = foldAst(mapsTaggedErrorReducer)(handler)(false)

    // Only flag handlers that rethrow or return raw Error because that skips domain mapping.
    const returnsRawErrorReducer = (found: boolean, current: ts.Node) => {
      const rawError = pipe(
        Match.value(current),
        Match.when(ts.isThrowStatement, Function.constTrue),
        Match.when(ts.isNewExpression, isRawErrorConstruction),
        Match.orElse(Function.constFalse)
      )

      const signals = Array.make(found, rawError)

      return Array.some(signals, Boolean)
    }

    const returnsRawError = foldAst(returnsRawErrorReducer)(handler)(false)
    const mapsWithoutRawParts = Array.make(mapsTaggedError, !returnsRawError)
    const mapsWithoutRaw = Array.every(mapsWithoutRawParts, Boolean)
    const quiet = Array.make(mapsWithoutRaw, !returnsRawError)

    if (Array.some(quiet, Boolean)) {
      return emptyAdviceFindings
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeAdviceFinding("typed-boundary-error")(subject)(node.expression)

    return Array.of(finding)
  }
