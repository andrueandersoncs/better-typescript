import {
  Array,
  Match as EffectMatch,
  Function,
  HashSet,
  Match,
  Option,
  Struct,
  flow,
  pipe
} from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { fixedRuleMessage } from "../../rule/fixedRuleMessage.js"
import { makeRule } from "../../rule/makeRule.js"
import { acceptsNode } from "../../scanner/acceptsNode.js"
import { makeNodeScanner } from "../../scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { foldAst } from "../../sources/foldAst.js"
import { callExpressionOf } from "../../support/callExpressionOf.js"
import type { ImportedMember } from "../../support/effectApi/importedMember.js"
import { importedMemberAt } from "../../support/effectApi/importedMemberAt.js"
import { propertyAssignmentNamed } from "../../support/effectApi/propertyAssignments.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { apiSubject } from "./apiSubject.js"
import { backoffScheduleNames } from "./backoffScheduleNames.js"
import { callIsEffectApi } from "./callIsEffectApi.js"
import {
  callArgumentAt,
  callOrPipeStageSubject,
  effectApiCall,
  effectApiReference,
  hasAncestor,
  isFunctionLikeExpression
} from "./effectApiFacts.js"
import { memberLastName } from "./memberLastName.js"
import { retryEffectNames } from "./retryEffectNames.js"
import { makeSubjectMatch, noSubjectMatches } from "./subjectMatch.js"

const objectLiteralArgument = flow(
  unwrapTransparentExpression,
  Option.liftPredicate(ts.isObjectLiteralExpression)
)

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
      const notPropertyAccess = strictEqual(false)(isPropertyAccess)
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

const sleepNames = Array.of("sleep")

const effectVitestModules = Array.make("@effect/vitest", "@effect/vitest/index")

const effectVitestMember = ({ moduleSpecifier, path }: ImportedMember) => {
  const candidateMatchesModule = (candidate: string) => {
    const matchesModule = strictEqual(candidate)(moduleSpecifier)
    const matchesSubpath = moduleSpecifier.startsWith(`${candidate}/`)
    const matches = Array.make(matchesModule, matchesSubpath)

    return Array.some(matches, Boolean)
  }

  const effectVitestModule = Array.some(effectVitestModules, candidateMatchesModule)
  const testMember = pipe(Array.head(path), Option.contains("it"))
  const checks = Array.make(effectVitestModule, testMember)

  return Array.every(checks, Boolean)
}

const importedCallMember = (checker: ts.TypeChecker) =>
  flow(
    Struct.get<ts.CallExpression, "expression">("expression"),
    unwrapCallee,
    importedMemberAt(checker)
  )

const isEffectVitestTestCall = (checker: ts.TypeChecker) =>
  flow(
    callExpressionOf,
    Option.flatMap(importedCallMember(checker)),
    Option.exists(effectVitestMember)
  )

const isInsideEffectVitestTest = flow(isEffectVitestTestCall, hasAncestor)

const isTrueLiteral = (expression: ts.Expression) => {
  const unwrapped = unwrapTransparentExpression(expression)

  return strictEqual(ts.SyntaxKind.TrueKeyword)(unwrapped.kind)
}

const isEmptyForCondition = (condition: ts.ForStatement["condition"]) =>
  pipe(Option.fromNullishOr(condition), Option.isNone)

const whileTrueMatch = (statement: ts.WhileStatement) =>
  isTrueLiteral(statement.expression) ? Option.some(statement) : Option.none()

const emptyForMatch = (statement: ts.ForStatement) =>
  isEmptyForCondition(statement.condition) ? Option.some(statement) : Option.none()

const whileTrueStatement = (node: ts.Node) =>
  pipe(
    EffectMatch.value(node),
    EffectMatch.when(ts.isWhileStatement, whileTrueMatch),
    EffectMatch.when(ts.isForStatement, emptyForMatch),
    EffectMatch.orElse(() => Option.none())
  )

const testSleepFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    if (!isInsideEffectVitestTest(context.checker)(node)) {
      return noSubjectMatches
    }

    return pipe(
      callOrPipeStageSubject(context.checker)("Effect")(sleepNames)(node),
      Option.map(makeSubjectMatch("Effect.sleep")),
      Option.toArray
    )
  }

const ancestorIsWhileTrue = flow(whileTrueStatement, Option.isSome)

const productionSleepLoopFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const matchesSleep = effectApiCall(context.checker)("Effect")(sleepNames)
    const insideWhileTrue = hasAncestor(ancestorIsWhileTrue)

    return pipe(
      callExpressionOf(node),
      Option.filter(matchesSleep),
      Option.filter(insideWhileTrue),
      Option.map(makeSubjectMatch("Effect.sleep")),
      Option.toArray
    )
  }

const retryNames = Array.of("retry")

const timesNames = Array.of("times")

const scheduleNames = Array.of("schedule")

const whileUntilNames = Array.make("while", "until")

const unboundedRetryWaiverPattern =
  /unbounded|forever-ok|allow-forever|effect-quality-allow-unbounded-retry/i

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
      propertyAssignmentNamed(timesNames)(object),
      Option.exists(timesPropertyIsBound)
    )

    const hasWhileUntil = pipe(propertyAssignmentNamed(whileUntilNames)(object), Option.isSome)
    const scheduleProperty = propertyAssignmentNamed(scheduleNames)(object)

    const scheduleBounded = pipe(
      scheduleProperty,
      Option.map(propertyScheduleIsBounded(checker)),
      Option.getOrElse(Function.constant(false))
    )

    const hasSchedule = Option.isSome(scheduleProperty)
    const scheduleMissingBound = strictEqual(false)(scheduleBounded)
    const unboundedSchedule = hasSchedule && scheduleMissingBound
    const lacksTimes = strictEqual(false)(hasTimes)
    const lacksWhileUntil = strictEqual(false)(hasWhileUntil)
    const lacksBound = lacksTimes && lacksWhileUntil
    const unboundedAndUnbound = unboundedSchedule && lacksBound
    const timesOrWhile = hasTimes || hasWhileUntil
    const scheduleAbsent = strictEqual(false)(hasSchedule)
    const boundedOrAbsentSchedule = scheduleBounded || scheduleAbsent
    const explicitlyBounded = timesOrWhile || boundedOrAbsentSchedule
    const notUnboundedCombo = strictEqual(false)(unboundedAndUnbound)
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
  const optionsMissingBound = strictEqual(false)(optionsBounded)
  const optionsUnbounded = asObject && optionsMissingBound
  const scheduleBounded = asObject ? true : scheduleExpressionIsBounded(checker)(unwrapped)
  const scheduleMissingBound = strictEqual(false)(scheduleBounded)
  const notObject = strictEqual(false)(asObject)
  const scheduleUnbounded = notObject && scheduleMissingBound

  return optionsUnbounded || scheduleUnbounded
}

const unboundedRetryFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    retryPolicyExpression(call),
    Option.filter(retryPolicyIsUnbounded(checker)),
    Option.map(() => makeSubjectMatch("Effect.retry")(call))
  )

const boundedRetryScheduleFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const matchesRetry = effectApiCall(context.checker)("Effect")(retryNames)
    const lacksWaiver = flow(hasUnboundedRetryWaiver(context.sourceFile), strictEqual(false))

    return pipe(
      callExpressionOf(node),
      Option.filter(matchesRetry),
      Option.filter(lacksWaiver),
      Option.flatMap(unboundedRetryFinding(context.checker)),
      Option.toArray
    )
  }

const isTestClockMember = (member: ImportedMember) => {
  const fromDirect = strictEqual("effect/testing/TestClock")(member.moduleSpecifier)
  const fromTestingModule = strictEqual("effect/testing")(member.moduleSpecifier)
  const path0 = Array.get(member.path, 0)
  const path1 = Array.get(member.path, 1)
  const fromTestingPath = pipe(path0, Option.contains("TestClock"))
  const fromTestingParts = Array.make(fromTestingModule, fromTestingPath)
  const fromTestingNamespace = Array.every(fromTestingParts, Boolean)
  const fromBarrelPath0 = pipe(path0, Option.contains("testing"))
  const fromBarrelPath1 = pipe(path1, Option.contains("TestClock"))
  const fromBarrelModule = strictEqual("effect")(member.moduleSpecifier)
  const fromBarrelParts = Array.make(fromBarrelModule, fromBarrelPath0, fromBarrelPath1)
  const fromBarrel = Array.every(fromBarrelParts, Boolean)
  const sources = Array.make(fromDirect, fromTestingNamespace, fromBarrel)

  return Array.some(sources, Boolean)
}

const timeEffectNames = Array.make(
  "sleep",
  "timeout",
  "timeoutTo",
  "timeoutFail",
  "timeoutFailCause"
)

const isTestClockApiAt =
  (checker: ts.TypeChecker) => (names: ReadonlyArray<string>) => (expression: ts.Expression) =>
    pipe(
      importedMemberAt(checker)(expression),
      Option.exists((member) => {
        const name = memberLastName(member)
        const nameMatches = Array.contains(names, name)
        const isTestClock = isTestClockMember(member)
        const checks = Array.make(nameMatches, isTestClock)

        return Array.every(checks, Boolean)
      })
    )

const testClockNames = Array.make("adjust", "setTime", "withLive", "testClockWith", "layer", "make")

const testClockReferenceNode = (checker: ts.TypeChecker) => (current: ts.Node) => {
  const isIdentifier = ts.isIdentifier(current)
  const isPropertyAccess = ts.isPropertyAccessExpression(current)
  const referenceKinds = Array.make(isIdentifier, isPropertyAccess)

  if (Array.some(referenceKinds, Boolean)) {
    return pipe(
      importedMemberAt(checker)(current as ts.Expression),
      Option.exists(isTestClockMember)
    )
  }

  const isCall = ts.isCallExpression(current)

  return isCall ? isTestClockApiAt(checker)(testClockNames)(current.expression) : isCall
}

const sourceFileHasTestClock = (checker: ts.TypeChecker) => (sourceFile: ts.SourceFile) => {
  const reducer = (found: boolean) => (current: ts.Node) => {
    const hasTestClock = testClockReferenceNode(checker)(current)
    const signals = Array.make(found, hasTestClock)

    return Array.some(signals, Boolean)
  }

  const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
    reducer(found)(current)
  )

  return foldAst(uncurriedReducer)(sourceFile)(false)
}

const testClockForTimeCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    if (!isInsideEffectVitestTest(context.checker)(node)) {
      return noSubjectMatches
    }

    const timeEffect = callIsEffectApi(context.checker)("Effect")(timeEffectNames)(node)
    const retryEffect = callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)
    const scheduleBackoff = callIsEffectApi(context.checker)("Schedule")(backoffScheduleNames)(node)
    const usesTime = Array.make(timeEffect, retryEffect, scheduleBackoff)
    const hasTimeUsage = Array.some(usesTime, Boolean)
    const hasClock = sourceFileHasTestClock(context.checker)(context.sourceFile)
    const quiet = Array.make(!hasTimeUsage, hasClock)

    if (Array.some(quiet, Boolean)) {
      return noSubjectMatches
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const runtimeKinds = Array.make(
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.DeleteExpression,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.ForStatement
)

const callKinds = Array.of(ts.SyntaxKind.CallExpression)

const testSleepsScanner = makeNodeScanner(runtimeKinds)(acceptsNode)(testSleepFindings)

export const testSleeps = makeRule("test-sleeps")(testSleepsScanner)(
  fixedRuleMessage(
    "Avoid Effect.sleep in tests; synchronize deterministically.",
    "Use TestClock, Deferred, Queue, Latch, Ref, or an explicit test hook."
  )
)

const productionSleepLoopsScanner = makeNodeScanner(runtimeKinds)(acceptsNode)(
  productionSleepLoopFindings
)

export const productionSleepLoops = makeRule("production-sleep-loops")(productionSleepLoopsScanner)(
  fixedRuleMessage(
    "Avoid manual Effect.sleep loops; use Schedule and Effect.repeat.",
    "Express repetition, pacing, and backoff as an Effect Schedule."
  )
)

const boundedRetryScheduleScanner = makeNodeScanner(runtimeKinds)(acceptsNode)(
  boundedRetryScheduleFindings
)

export const boundedRetrySchedule = makeRule("bounded-retry-schedule")(boundedRetryScheduleScanner)(
  fixedRuleMessage(
    "Use a bounded retry schedule unless a local waiver documents forever retry.",
    "Use recurs or upTo to make retries operationally bounded."
  )
)

const testClockForTimeScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  testClockForTimeCandidates
)

export const testClockForTime = makeRule("test-clock-for-time")(testClockForTimeScanner)(
  fixedRuleMessage(
    "Use TestClock for time-sensitive tests.",
    "Fork time-dependent work, then advance TestClock instead of real time."
  )
)
