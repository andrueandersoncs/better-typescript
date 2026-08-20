import * as ts from "typescript"
import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

export const unwrapTowerCarrier = (expression: ts.Expression): ts.Expression =>
  ts.isNonNullExpression(expression)
    ? unwrapTowerCarrier(expression.expression)
    : unwrapTransparentExpression(expression)
