import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { importedMemberAt, type ImportedMember } from "../functionalCoreEffect/support.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import { isTestRole } from "./architectureRoles.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import { memberLastName } from "./importedMembers.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import {
  apiSubject,
  backoffScheduleNames,
  callIsEffectApi,
  retryEffectNames
} from "./evidenceSupport.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const timeEffectNames = Array.make(
  "sleep",
  "timeout",
  "timeoutTo",
  "timeoutFail",
  "timeoutFailCause"
)

const isTestClockMember = (member: ImportedMember) => {
  const fromDirect = strictEqual(member.moduleSpecifier, "effect/testing/TestClock")
  const fromTestingModule = strictEqual(member.moduleSpecifier, "effect/testing")
  const path0 = Array.get(member.path, 0)
  const path1 = Array.get(member.path, 1)
  const fromTestingPath = pipe(path0, Option.contains("TestClock"))
  const fromTestingParts = Array.make(fromTestingModule, fromTestingPath)
  const fromTestingNamespace = Array.every(fromTestingParts, Boolean)
  const fromBarrelPath0 = pipe(path0, Option.contains("testing"))
  const fromBarrelPath1 = pipe(path1, Option.contains("TestClock"))
  const fromBarrelModule = strictEqual(member.moduleSpecifier, "effect")
  const fromBarrelParts = Array.make(fromBarrelModule, fromBarrelPath0, fromBarrelPath1)
  const fromBarrel = Array.every(fromBarrelParts, Boolean)
  const sources = Array.make(fromDirect, fromTestingNamespace, fromBarrel)

  return Array.some(sources, Boolean)
}

const isTestClockApiAt =
  (checker: ts.TypeChecker) => (names: ReadonlyArray<string>) => (expression: ts.Expression) =>
    pipe(
      importedMemberAt(checker, expression),
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
      importedMemberAt(checker, current as ts.Expression),
      Option.exists(isTestClockMember)
    )
  }

  const isCall = ts.isCallExpression(current)

  return isCall ? isTestClockApiAt(checker)(testClockNames)(current.expression) : isCall
}

const sourceFileHasTestClock = (checker: ts.TypeChecker) => (sourceFile: ts.SourceFile) => {
  const reducer = (found: boolean, current: ts.Node) => {
    const hasTestClock = testClockReferenceNode(checker)(current)
    const signals = Array.make(found, hasTestClock)

    return Array.some(signals, Boolean)
  }

  return foldAst(reducer)(sourceFile)(false)
}

const isItLiveCall = (node: ts.CallExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const isPropertyAccess = ts.isPropertyAccessExpression(expression)

  if (!isPropertyAccess) {
    return isPropertyAccess
  }

  const isLiveName = strictEqual(expression.name.text, "live")

  if (!isLiveName) {
    return isLiveName
  }

  const receiver = unwrapTransparentExpression(expression.expression)
  const isIdentifier = ts.isIdentifier(receiver)
  const receiverText = isIdentifier ? receiver.text : ""
  const isItName = strictEqual(receiverText, "it")
  const checks = Array.make(isIdentifier, isItName)

  return Array.every(checks, Boolean)
}

export const testLiveRuntime =
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const liveCall = isItLiveCall(node)
    const eligible = Array.make(testRole, liveCall)

    if (!Array.every(eligible, Boolean)) {
      return emptyAdviceFindings
    }

    const finding = makeAdviceFinding("test-live-runtime")("it.live")(node.expression)

    return Array.of(finding)
  }

export const testClockForTime =
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    if (!isTestRole(role)) {
      return emptyAdviceFindings
    }

    const timeEffect = callIsEffectApi(context.checker)("Effect")(timeEffectNames)(node)
    const retryEffect = callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)
    const scheduleBackoff = callIsEffectApi(context.checker)("Schedule")(backoffScheduleNames)(node)
    const usesTime = Array.make(timeEffect, retryEffect, scheduleBackoff)
    const hasTimeUsage = Array.some(usesTime, Boolean)
    const hasClock = sourceFileHasTestClock(context.checker)(context.sourceFile)
    const quiet = Array.make(!hasTimeUsage, hasClock)

    if (Array.some(quiet, Boolean)) {
      return emptyAdviceFindings
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeAdviceFinding("test-clock-for-time")(subject)(node.expression)

    return Array.of(finding)
  }
