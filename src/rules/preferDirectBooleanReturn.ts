import { Function, Match, Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression, unwrapSingleStatementBlock } from "./tsNode.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-direct-boolean-return"

interface BooleanReturn {
  readonly value: boolean
}

interface DirectBooleanReturnMatch {
  readonly ifStatement: ts.IfStatement
  readonly literalValue: boolean
  readonly returnExpression: string
}

const booleanLiteralValue = (expression: ts.Expression): Option.Option<boolean> => {
  const unwrapped = unwrapExpression(expression)

  return Match.value(unwrapped.kind).pipe(
    Match.when(ts.SyntaxKind.TrueKeyword, Function.constTrue),
    Match.when(ts.SyntaxKind.FalseKeyword, Function.constFalse),
    Match.option
  )
}

const booleanReturnFromStatement = (statement: ts.Statement): Option.Option<BooleanReturn> =>
  Option.gen(function* () {
    const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(
      unwrapSingleStatementBlock(statement)
    )
    const expression = yield* Option.fromNullable(returnStatement.expression)
    const value = yield* booleanLiteralValue(expression)

    return { value }
  })

const toDirectBooleanMatch =
  (context: RuleContext, ifStatement: ts.IfStatement) =>
  (thenReturn: BooleanReturn): DirectBooleanReturnMatch => {
    const conditionText = ifStatement.expression.getText(context.sourceFile)

    return {
      ifStatement,
      literalValue: thenReturn.value,
      returnExpression: thenReturn.value ? `(${conditionText})` : `!(${conditionText})`
    }
  }

const directBooleanReturnMatch = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<DirectBooleanReturnMatch> =>
  Option.map(
    booleanReturnFromStatement(ifStatement.thenStatement),
    toDirectBooleanMatch(context, ifStatement)
  )

const directBooleanRuleMatch =
  (context: RuleContext) =>
  (match: DirectBooleanReturnMatch): RuleMatch =>
    createRuleMatch(context, {
      ruleId,
      node: match.ifStatement,
      message: `Avoid returning ${String(match.literalValue)} from a conditional branch.`,
      hint: `Use the condition as the boolean value instead: return ${match.returnExpression}.`
    })

const directBooleanMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  Option.toArray(
    Option.map(directBooleanReturnMatch(context, ifStatement), directBooleanRuleMatch(context))
  )

export const preferDirectBooleanReturn: Rule = {
  id: ruleId,
  description:
    "Prefer returning boolean expressions directly instead of conditional boolean literals.",
  check: onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, directBooleanMatches)
}
