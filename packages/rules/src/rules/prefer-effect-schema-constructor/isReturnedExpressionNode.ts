import * as ts from "typescript"
import type { ReturnedExpressionNode } from "../../internal/support/returnedExpressionNode.js"

export const isReturnedExpressionNode = (node: ts.Node): node is ReturnedExpressionNode =>
  ts.isReturnStatement(node) || ts.isArrowFunction(node)
