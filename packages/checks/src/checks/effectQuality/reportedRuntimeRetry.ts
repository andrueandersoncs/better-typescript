import { Array, Function, HashSet, Match, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { propertyAssignmentNamed } from "../functionalCoreEffect/support.js"
import { callExpressionOf, unwrapCallee, unwrapTransparentExpression } from "../support/tsNode.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import type { EffectQualityIndex } from "./index.js"
import { makeRuleFinding } from "./makeFindings.js"
import {
  callArgumentAt,
  effectApiCall,
  effectApiReference,
  isFunctionLikeExpression,
  objectLiteralArgument
} from "./reportedRuntimeSupport.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const retryNames = Array.of("retry")

const scheduleForeverNames = Array.of("forever")

const scheduleBoundNames = Array.make(
  "recurs",
  "upTo",
  "times",
  "count",
  "while_",
  "until",
  "intersect"
)

const scheduleBaseNames = Array.make(
  "exponential",
  "fibonacci",
  "spaced",
  "fixed",
  "forever",
  "repeatForever",
  "fromDelay",
  "fromDelays"
)

const timesNames = Array.of("times")

const scheduleNames = Array.of("schedule")

const whileUntilNames = Array.make("while", "until")

const scheduleBoundMethodNames = HashSet.make(
  "compose",
  "intersect",
  "either",
  "andThen",
  "upTo",
  "while",
  "until",
  "times",
  "recurs"
)

const unboundedRetryWaiverPattern =
  /unbounded|forever-ok|allow-forever|effect-quality-allow-unbounded-retry/i

const boundedRetryScheduleFinding = makeRuleFinding("bounded-retry-schedule")

const emptyCommentRanges: ReadonlyArray<ts.CommentRange> = Array.empty()

const commentRangeText = (sourceText: string) => (range: ts.CommentRange) =>
  sourceText.slice(range.pos, range.end)

const leadingCommentText = (sourceFile: ts.SourceFile) => (node: ts.Node) => {
  const fullStart = node.getFullStart()
  const leadingRanges = ts.getLeadingCommentRanges(sourceFile.text, fullStart)
  const ranges = leadingRanges ?? emptyCommentRanges

  return pipe(ranges, Array.map(commentRangeText(sourceFile.text)), Array.join("\n"))
}

const commentsMatchUnboundedWaiver = (comments: string) =>
  unboundedRetryWaiverPattern.test(comments)

const hasUnboundedRetryWaiver = (sourceFile: ts.SourceFile) =>
  flow(leadingCommentText(sourceFile), commentsMatchUnboundedWaiver)

const scheduleExpressionIsBounded =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): boolean => {
    const unwrapped = unwrapTransparentExpression(expression)
    const scheduleReference = effectApiReference(checker)("Schedule")
    const isBoundName = scheduleReference(scheduleBoundNames)
    const isForeverName = scheduleReference(scheduleForeverNames)
    const isBaseName = scheduleReference(scheduleBaseNames)
    const boundedSelf = scheduleExpressionIsBounded(checker)

    const boundCallResult = (call: ts.CallExpression) => {
      const callee = unwrapCallee(call.expression)
      const boundByName = isBoundName(callee)
      const foreverMatch = isForeverName(callee)
      const baseMatch = isBaseName(callee)
      const foreverOrBase = Array.make(foreverMatch, baseMatch)
      const isForeverOrBase = Array.some(foreverOrBase, Boolean)
      const calleeExpression = unwrapTransparentExpression(call.expression)
      const isPropertyAccess = ts.isPropertyAccessExpression(calleeExpression)
      const method = isPropertyAccess ? calleeExpression.name.text : ""
      const receiver = isPropertyAccess ? calleeExpression.expression : call.expression
      const receiverBounded = isPropertyAccess && boundedSelf(receiver)
      const isBoundMethod = HashSet.has(scheduleBoundMethodNames, method)
      const argumentBounded = Array.some(call.arguments, boundedSelf)
      const eitherSideBounded = receiverBounded || argumentBounded
      const methodCombinesBound = isBoundMethod && eitherSideBounded
      const propertyBoundByMethod = isBoundMethod ? methodCombinesBound : receiverBounded
      const propertyBound = isPropertyAccess && propertyBoundByMethod
      const notPropertyAccess = strictEqual(isPropertyAccess, false)
      const unboundByShape = isForeverOrBase || notPropertyAccess
      const namedOrProperty = boundByName || propertyBound

      return unboundByShape ? boundByName : namedOrProperty
    }

    return pipe(
      Match.value(unwrapped),
      Match.when(ts.isCallExpression, boundCallResult),
      Match.when(ts.isPropertyAccessExpression, isBoundName),
      Match.orElse(Function.constFalse)
    )
  }

const timesPropertyIsBound = (property: ts.ObjectLiteralElementLike) =>
  pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(property),
    Option.map(flow(Struct.get("initializer"), unwrapTransparentExpression)),
    Option.exists((value) => {
      const asNumber = ts.isNumericLiteral(value)
      const asIdentifier = ts.isIdentifier(value)

      return asNumber || asIdentifier
    })
  )

const propertyScheduleIsBounded =
  (checker: ts.TypeChecker) => (property: ts.ObjectLiteralElementLike) =>
    ts.isPropertyAssignment(property) && scheduleExpressionIsBounded(checker)(property.initializer)

const objectRetryOptionsAreBounded =
  (checker: ts.TypeChecker) => (object: ts.ObjectLiteralExpression) => {
    const hasTimes = pipe(
      propertyAssignmentNamed(object, timesNames),
      Option.exists(timesPropertyIsBound)
    )

    const hasWhileUntil = pipe(propertyAssignmentNamed(object, whileUntilNames), Option.isSome)
    const scheduleProperty = propertyAssignmentNamed(object, scheduleNames)

    const scheduleBounded = pipe(
      scheduleProperty,
      Option.map(propertyScheduleIsBounded(checker)),
      Option.getOrElse(Function.constant(false))
    )

    const hasSchedule = Option.isSome(scheduleProperty)
    const scheduleMissingBound = strictEqual(scheduleBounded, false)
    const unboundedSchedule = hasSchedule && scheduleMissingBound
    const lacksTimes = strictEqual(hasTimes, false)
    const lacksWhileUntil = strictEqual(hasWhileUntil, false)
    const lacksBound = lacksTimes && lacksWhileUntil
    const unboundedAndUnbound = unboundedSchedule && lacksBound
    const timesOrWhile = hasTimes || hasWhileUntil
    const scheduleAbsent = strictEqual(hasSchedule, false)
    const boundedOrAbsentSchedule = scheduleBounded || scheduleAbsent
    const explicitlyBounded = timesOrWhile || boundedOrAbsentSchedule
    const notUnboundedCombo = strictEqual(unboundedAndUnbound, false)
    const boundedFlags = Array.make(notUnboundedCombo, explicitlyBounded)

    return Array.every(boundedFlags, Boolean)
  }

const retryOptionsAreBounded = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(objectLiteralArgument(expression), Option.exists(objectRetryOptionsAreBounded(checker)))

const expressionIsObjectLiteral = flow(unwrapTransparentExpression, ts.isObjectLiteralExpression)

const expressionIsFunctionLike = flow(unwrapTransparentExpression, isFunctionLikeExpression)

const retryPolicyExpression = (call: ts.CallExpression) => {
  const first = callArgumentAt(0)(call)
  const second = callArgumentAt(1)(call)
  const firstIsOptions = pipe(first, Option.exists(expressionIsObjectLiteral))
  const firstIsHandler = pipe(first, Option.exists(expressionIsFunctionLike))

  if (firstIsOptions) {
    return first
  }

  if (Option.isSome(second)) {
    return second
  }

  return firstIsHandler ? Option.none() : first
}

const retryPolicyIsUnbounded = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const unwrapped = unwrapTransparentExpression(expression)
  const asObject = ts.isObjectLiteralExpression(unwrapped)
  const optionsBounded = asObject ? retryOptionsAreBounded(checker)(unwrapped) : true
  const optionsMissingBound = strictEqual(optionsBounded, false)
  const optionsUnbounded = asObject && optionsMissingBound
  const scheduleBounded = asObject ? true : scheduleExpressionIsBounded(checker)(unwrapped)
  const scheduleMissingBound = strictEqual(scheduleBounded, false)
  const notObject = strictEqual(asObject, false)
  const scheduleUnbounded = notObject && scheduleMissingBound

  return optionsUnbounded || scheduleUnbounded
}

const unboundedRetryFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    retryPolicyExpression(call),
    Option.filter(retryPolicyIsUnbounded(checker)),
    Option.map(() => boundedRetryScheduleFinding("Effect.retry")(call))
  )

export const boundedRetryScheduleFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const matchesRetry = effectApiCall(context.checker)("Effect")(retryNames)

  const lacksWaiver = (call: ts.CallExpression) => {
    const hasWaiver = hasUnboundedRetryWaiver(context.sourceFile)(call)

    return strictEqual(hasWaiver, false)
  }

  return pipe(
    callExpressionOf(node),
    Option.filter(matchesRetry),
    Option.filter(lacksWaiver),
    Option.flatMap(unboundedRetryFinding(context.checker)),
    Option.toArray
  )
}
