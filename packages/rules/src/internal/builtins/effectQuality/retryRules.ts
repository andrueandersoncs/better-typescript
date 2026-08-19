import { Array, Function, Match, Option, Predicate, Struct, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { fixedRuleMessage } from "../../rule/fixedRuleMessage.js"
import { makeRule } from "../../rule/makeRule.js"
import { makeNodeScanner } from "../../scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { foldAst } from "../../sources/foldAst.js"
import { enclosingFunctionLike } from "../../support/effectApi/enclosingFunctionLike.js"
import { importedEffectApiAt } from "../../support/effectApi/importedEffectApiAt.js"
import { propertyNameText } from "../../support/propertyNameText.js"
import { apiSubject } from "./apiSubject.js"
import { backoffScheduleNames } from "./backoffScheduleNames.js"
import { callIsEffectApi } from "./callIsEffectApi.js"
import { declarationNameText } from "./declarationNameText.js"
import { retryEffectNames } from "./retryEffectNames.js"
import { makeSubjectMatch, noSubjectMatches } from "./subjectMatch.js"

const enclosingFunctionName = (node: ts.Node) =>
  pipe(
    enclosingFunctionLike(node),
    Option.flatMap((declaration) => {
      const direct = declarationNameText(declaration)

      if (Option.isSome(direct)) {
        return direct
      }

      return pipe(
        Option.fromNullishOr(declaration.parent),
        Option.flatMap((parent) => {
          const variableName = pipe(
            Option.some(parent),
            Option.filter(ts.isVariableDeclaration),
            Option.map(Struct.get("name")),
            Option.filter(ts.isIdentifier),
            Option.map(Struct.get("text"))
          )

          if (Option.isSome(variableName)) {
            return variableName
          }

          return pipe(
            Option.some(parent),
            Option.filter(ts.isPropertyAssignment),
            Option.map(Struct.get("name")),
            Option.flatMap(propertyNameText)
          )
        })
      )
    })
  )

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

const mutationOperationPattern =
  /^(create|insert|update|upsert|delete|remove|write|save|put|post|patch|send|publish|enqueue|dispatch|mutate)/i

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

const operationNameNear = (node: ts.Node) =>
  pipe(enclosingFunctionName(node), Option.getOrElse(Function.constant("")))

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

const isIdempotentOperationName = (operationName: string) =>
  /^(get|list|find|read|lookup|fetch|resolve|load|query|check)/i.test(operationName)

const idempotentRetryCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const notRetry = !callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)

    if (notRetry) {
      return noSubjectMatches
    }

    const operation = operationNameNear(node)
    const missingOperation = strictEqual(0)(operation.length)
    const alreadyIdempotent = isIdempotentOperationName(operation)
    const notMutation = !mutationOperationPattern.test(operation)
    const quiet = Array.make(missingOperation, alreadyIdempotent, notMutation)

    if (Array.some(quiet, Boolean)) {
      return noSubjectMatches
    }

    const api = apiSubject(context)("Effect.retry")(node.expression)
    const subject = `${api} (${operation})`
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const callKinds = Array.of(ts.SyntaxKind.CallExpression)

const retryWithoutJitterScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  retryWithoutJitterCandidates
)

export const retryWithoutJitter = makeRule("retry-without-jitter")(retryWithoutJitterScanner)(
  fixedRuleMessage(
    "Jitter exponential retry.",
    "Add Schedule.jittered to the bounded backoff schedule."
  )
)

const idempotentRetryScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  idempotentRetryCandidates
)

export const idempotentRetry = makeRule("idempotent-retry")(idempotentRetryScanner)(
  fixedRuleMessage(
    "Retry only idempotent operations.",
    "Establish idempotency in the domain contract before applying retry."
  )
)
