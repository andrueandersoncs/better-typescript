import * as ts from "typescript"

export const unwrapExpression = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression) ? unwrapExpression(expression.expression) : expression
