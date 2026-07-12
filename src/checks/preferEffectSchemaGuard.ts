import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { unwrapExpression } from "./support/tsNode.js"
import { astChildren } from "../engine/sources.js"
import { detection } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"

const conditionExpressions = (
  expression: ts.Expression
): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapExpression(expression)

  return pipe(
    astChildren(unwrapped)
      .filter(ts.isExpression)
      .flatMap(conditionExpressions),
    Array.prepend(unwrapped)
  )
}

const binaryExpressionIsStringKeyIn = (
  expression: ts.BinaryExpression
): boolean => {
  const isInOperator = expression.operatorToken.kind === ts.SyntaxKind.InKeyword
  const keyExpression = unwrapExpression(expression.left)
  const hasStringKey =
    ts.isStringLiteral(keyExpression) ||
    ts.isNoSubstitutionTemplateLiteral(keyExpression)

  return isInOperator && hasStringKey
}

const isStringKeyInExpression = (
  expression: ts.Expression
): expression is ts.BinaryExpression =>
  pipe(
    Option.liftPredicate(ts.isBinaryExpression)(expression),
    Option.exists(binaryExpressionIsStringKeyIn)
  )

const schemaGuardMatch =
  (sourceFile: ts.SourceFile) =>
  (match: MakeDetection) =>
  (expression: ts.BinaryExpression): Detection => {
    const propertyName = unwrapExpression(expression.left).getText(sourceFile)
    const objectText = expression.right.getText(sourceFile)

    return match({
      node: expression,
      message: `Avoid using ${propertyName} in ${objectText} as a type guard.`,
      hint: `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${objectText}).`
    })
  }

const inOperatorGuardMatches = (context: CheckContext) => {
  const match = detection(context)
  const guardMatch = schemaGuardMatch(context.sourceFile)(match)

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> =>
    conditionExpressions(ifStatement.expression)
      .filter(isStringKeyInExpression)
      .map(guardMatch)

  return matches
}

const check = nodeCheck([ts.SyntaxKind.IfStatement])(ts.isIfStatement)(
  inOperatorGuardMatches
)

export const preferEffectSchemaGuard: Check = check
