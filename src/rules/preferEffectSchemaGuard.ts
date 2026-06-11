import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { astChildren } from "./traverse.js"
import { unwrapExpression } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-schema-guard"

const conditionExpressions = (expression: ts.Expression): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapExpression(expression)

  return [
    unwrapped,
    ...astChildren(unwrapped).filter(ts.isExpression).flatMap(conditionExpressions)
  ]
}

const isStringLiteralLike = (expression: ts.Expression): boolean =>
  ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)

const isStringKeyInExpression = (
  expression: ts.Expression
): expression is ts.BinaryExpression => {
  if (ts.isBinaryExpression(expression)) {
    const isInOperator = expression.operatorToken.kind === ts.SyntaxKind.InKeyword
    const hasStringKey = isStringLiteralLike(unwrapExpression(expression.left))
    const isStringKeyIn = isInOperator && hasStringKey

    return isStringKeyIn
  }

  return false
}

const schemaGuardMatch = (context: RuleContext) => (expression: ts.BinaryExpression): RuleMatch => {
  const sourceFile = context.sourceFile
  const propertyName = unwrapExpression(expression.left).getText(sourceFile)
  const objectText = expression.right.getText(sourceFile)

  return createRuleMatch(context, {
    ruleId,
    node: expression,
    message: `Avoid using ${propertyName} in ${objectText} as a type guard.`,
    hint: `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${objectText}).`
  })
}

const inOperatorGuardMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  conditionExpressions(ifStatement.expression)
    .filter(isStringKeyInExpression)
    .map(schemaGuardMatch(context))

export const preferEffectSchemaGuard = new Rule({
  id: ruleId,
  description: "Prefer Effect Schema guards over string-key in-operator checks.",
  check: onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, inOperatorGuardMatches)
})
