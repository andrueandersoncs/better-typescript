import * as ts from "typescript"

export const calleeMethodName = (expression: ts.Expression) => {
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text
  }

  return ts.isIdentifier(expression) ? expression.text : ""
}
