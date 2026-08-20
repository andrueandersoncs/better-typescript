import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Match as EffectMatch, Option, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { callExpressionOf } from "../../internal/support/callExpressionOf.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { effectApiCall, hasAncestor } from "../../internal/builtins/effectQuality/effectApiFacts.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

import { sleepNames } from "../../internal/builtins/effectQuality/timeAndRetryRulesShared.js"

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

const productionSleepLoopsScanner = makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(
  productionSleepLoopFindings
)

export const productionSleepLoops = makeRule("production-sleep-loops")(productionSleepLoopsScanner)(
  fixedRuleMessage(
    "Avoid manual Effect.sleep loops; use Schedule and Effect.repeat.",
    "Express repetition, pacing, and backoff as an Effect Schedule."
  )
)
