import { Array, Match, Option, flow, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { callExpressionOf, unwrapTransparentExpression } from "../support/tsNode.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { roleForSourceFile, type EffectQualityIndex } from "./index.js"
import { isTestRole } from "./architectureRoles.js"
import { emptyRuleFindings, makeRuleFinding } from "./makeFindings.js"
import { callOrPipeStageSubject, effectApiCall, hasAncestor } from "./reportedRuntimeSupport.js"

const sleepNames = Array.of("sleep")

const testSleepsFinding = makeRuleFinding("test-sleeps")

const productionSleepLoopsFinding = makeRuleFinding("production-sleep-loops")

const isTrueLiteral = (expression: ts.Expression) => {
  const unwrapped = unwrapTransparentExpression(expression)

  return unwrapped.kind === ts.SyntaxKind.TrueKeyword
}

const isEmptyForCondition = (condition: ts.ForStatement["condition"]) =>
  pipe(Option.fromNullishOr(condition), Option.isNone)

const whileTrueMatch = (statement: ts.WhileStatement) =>
  isTrueLiteral(statement.expression) ? Option.some(statement) : Option.none()

const emptyForMatch = (statement: ts.ForStatement) =>
  isEmptyForCondition(statement.condition) ? Option.some(statement) : Option.none()

const whileTrueStatement = (node: ts.Node): Option.Option<ts.WhileStatement | ts.ForStatement> =>
  pipe(
    Match.value(node),
    Match.when(ts.isWhileStatement, whileTrueMatch),
    Match.when(ts.isForStatement, emptyForMatch),
    Match.orElse(() => Option.none())
  )

export const testSleepFindings = (
  context: CheckContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    roleForSourceFile(index, context.sourceFile),
    Option.filter(isTestRole),
    Option.flatMap(() => callOrPipeStageSubject(context.checker)("Effect")(sleepNames)(node)),
    Option.map(testSleepsFinding("Effect.sleep")),
    Option.toArray
  )

const ancestorIsWhileTrue = flow(whileTrueStatement, Option.isSome)

export const productionSleepLoopFindings = (
  context: CheckContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const role = roleForSourceFile(index, context.sourceFile)
  const isTest = Option.exists(role, isTestRole)
  const missingRole = Option.isNone(role)
  const skip = isTest || missingRole

  if (skip) {
    return emptyRuleFindings
  }

  const matchesSleep = effectApiCall(context.checker)("Effect")(sleepNames)
  const insideWhileTrue = hasAncestor(ancestorIsWhileTrue)

  return pipe(
    callExpressionOf(node),
    Option.filter(matchesSleep),
    Option.filter(insideWhileTrue),
    Option.map(productionSleepLoopsFinding("Effect.sleep")),
    Option.toArray
  )
}
