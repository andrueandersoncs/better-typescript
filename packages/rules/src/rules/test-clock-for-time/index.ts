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

import type { ImportedMember } from "../../internal/support/effectApi/importedMember.js"

import { importedMemberAt } from "../../internal/support/effectApi/importedMemberAt.js"

import { apiSubject } from "../../internal/builtins/effectQuality/apiSubject.js"

import { backoffScheduleNames } from "../../internal/builtins/effectQuality/backoffScheduleNames.js"

import { callIsEffectApi } from "../../internal/builtins/effectQuality/callIsEffectApi.js"

import { memberLastName } from "../../internal/builtins/effectQuality/memberLastName.js"

import { retryEffectNames } from "../../internal/builtins/effectQuality/retryEffectNames.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

import { isInsideEffectVitestTest } from "../../internal/builtins/effectQuality/timeAndRetryRulesShared.js"

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

const testClockForTimeScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  testClockForTimeCandidates
)

export const testClockForTime = makeRule("test-clock-for-time")(testClockForTimeScanner)(
  fixedRuleMessage(
    "Use TestClock for time-sensitive tests.",
    "Fork time-dependent work, then advance TestClock instead of real time."
  )
)
