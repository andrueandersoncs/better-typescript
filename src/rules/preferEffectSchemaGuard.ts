import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { astChildren } from "./traverse.js"
import { unwrapExpression } from "./tsNode.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-schema-guard"

export const preferEffectSchemaGuard: Rule = {
  id: ruleId,
  description: "Prefer Effect Schema guards over string-key in-operator checks.",
  check: onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, (ifStatement, context) =>
    conditionMatches(context, ifStatement.expression)
  )
}

const conditionMatches = (
  context: RuleContext,
  expression: ts.Expression
): ReadonlyArray<RuleMatch> =>
  conditionExpressions(expression)
    .filter(isStringKeyInExpression)
    .map((match) => schemaGuardMatch(context, match))

const conditionExpressions = (expression: ts.Expression): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapExpression(expression)

  return [
    unwrapped,
    ...astChildren(unwrapped).filter(ts.isExpression).flatMap(conditionExpressions)
  ]
}

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

const isStringLiteralLike = (expression: ts.Expression): boolean =>
  ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)

const schemaGuardMatch = (context: RuleContext, expression: ts.BinaryExpression): RuleMatch => {
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
