import { Function, Match, Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression, unwrapSingleStatementBlock } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-direct-boolean-return"

const booleanLiteralValue = (expression: ts.Expression): Option.Option<boolean> => {
  const unwrapped = unwrapExpression(expression)

  return Match.value(unwrapped.kind).pipe(
    Match.when(ts.SyntaxKind.TrueKeyword, Function.constTrue),
    Match.when(ts.SyntaxKind.FalseKeyword, Function.constFalse),
    Match.option
  )
}

const booleanReturnFromStatement = (statement: ts.Statement): Option.Option<boolean> =>
  Option.gen(function* () {
    const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(
      unwrapSingleStatementBlock(statement)
    )
    const expression = yield* Option.fromNullable(returnStatement.expression)

    return yield* booleanLiteralValue(expression)
  })

const directBooleanRuleMatch =
  (context: RuleContext, ifStatement: ts.IfStatement) =>
  (literalValue: boolean): RuleMatch => {
    const conditionText = ifStatement.expression.getText(context.sourceFile)
    const returnExpression = literalValue ? `(${conditionText})` : `!(${conditionText})`

    return createRuleMatch(context, {
      ruleId,
      node: ifStatement,
      message: `Avoid returning ${String(literalValue)} from a conditional branch.`,
      hint: `Use the condition as the boolean value instead: return ${returnExpression}.`
    })
  }

const directBooleanMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  Option.toArray(
    Option.map(
      booleanReturnFromStatement(ifStatement.thenStatement),
      directBooleanRuleMatch(context, ifStatement)
    )
  )

export const preferDirectBooleanReturn = new Rule({
  id: ruleId,
  description:
    "Prefer returning boolean expressions directly instead of conditional boolean literals.",
  check: onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, directBooleanMatches)
})
