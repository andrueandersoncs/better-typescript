import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapExpression } from "./support/tsNode.js"
import { astChildren } from "@better-typescript/core/engine/sources"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { defineCheck } from "../defineCheck.js"
import { detection } from "@better-typescript/core/engine/check"

const conditionExpressions = (expression: ts.Expression): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapExpression(expression)
  const children = astChildren(unwrapped)
  const filtered = Array.filter(children, ts.isExpression)

  return pipe(Array.flatMap(filtered, conditionExpressions), Array.prepend(unwrapped))
}

const binaryExpressionIsStringKeyIn = (expression: ts.BinaryExpression) => {
  const isInOperator = expression.operatorToken.kind === ts.SyntaxKind.InKeyword
  const keyExpression = unwrapExpression(expression.left)

  const hasStringKey =
    ts.isStringLiteral(keyExpression) || ts.isNoSubstitutionTemplateLiteral(keyExpression)

  return isInOperator && hasStringKey
}

const isStringKeyInExpression = (expression: ts.Expression): expression is ts.BinaryExpression =>
  pipe(
    Option.liftPredicate(ts.isBinaryExpression)(expression),
    Option.exists(binaryExpressionIsStringKeyIn)
  )

const inOperatorGuardMatches = (context: CheckContext) => {
  const match = detection(context)
  const sourceFile = context.sourceFile

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> =>
    pipe(
      conditionExpressions(ifStatement.expression),
      Array.filter(isStringKeyInExpression),
      Array.map((expression) => {
        const propertyName = unwrapExpression(expression.left).getText(sourceFile)
        const objectText = expression.right.getText(sourceFile)

        return match({
          node: expression,
          message: `Avoid using ${propertyName} in ${objectText} as a type guard.`,
          hint: `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${objectText}).`
        })
      })
    )

  return matches
}

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

export const preferEffectSchemaGuard = defineCheck(
  "prefer-effect-schema-guard",
  ifStatementKinds,
  ts.isIfStatement,
  inOperatorGuardMatches
)
