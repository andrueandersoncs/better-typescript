import * as ts from "typescript"
import { unwrapExpression } from "../../internal/support/unwrapExpression.js"

export const arrayLiteralElementCount = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)

  return ts.isArrayLiteralExpression(unwrapped) ? unwrapped.elements.length : -1
}
