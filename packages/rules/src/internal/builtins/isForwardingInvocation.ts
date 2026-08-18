import * as ts from "typescript"
import type { CallLikeExpression } from "../support/callLikeExpression.js"

export const isForwardingInvocation = (
  expression: ts.Expression
): expression is CallLikeExpression =>
  ts.isCallExpression(expression) || ts.isNewExpression(expression)
