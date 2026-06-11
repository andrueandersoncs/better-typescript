import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-inline-boolean-expressions"

const logicalOperatorKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken
])

const hasLogicalOperator = (expression: ts.BinaryExpression): boolean =>
  logicalOperatorKinds.has(expression.operatorToken.kind)

const isLogicalOperatorExpression = (expression: ts.Expression): boolean =>
  Option.exists(Option.liftPredicate(ts.isBinaryExpression)(expression), hasLogicalOperator)

const inlineBooleanConditionMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const expression = unwrapExpression(ifStatement.expression)

  return isLogicalOperatorExpression(expression)
    ? [
        createRuleMatch(context, {
          ruleId,
          node: expression,
          message: "Avoid boolean operators inline in an if statement condition.",
          hint:
            "Extract the expression into a well-named const variable declaration above the if " +
            "statement and use that variable in the if condition."
        })
      ]
    : []
}

export const noInlineBooleanExpressions = new Rule({
  id: ruleId,
  description: "Disallow boolean operators inline in an if statement condition.",
  check: onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, inlineBooleanConditionMatches)
})
