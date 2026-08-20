import * as ts from "typescript"
import { unwrapExpression } from "../../internal/support/unwrapExpression.js"

export const objectLiteralPropertyCount = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)

  return ts.isObjectLiteralExpression(unwrapped) ? unwrapped.properties.length : 0
}
