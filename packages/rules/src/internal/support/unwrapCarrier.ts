import * as ts from "typescript"
import { unwrapTransparentExpression } from "./transparentWrapper.js"

export const unwrapCarrier = (expression: ts.Expression): ts.Expression =>
  ts.isNonNullExpression(expression)
    ? unwrapCarrier(expression.expression)
    : unwrapTransparentExpression(expression)
