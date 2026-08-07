import { Array, HashSet } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import type { BooleanOperatorExpression } from "./booleanOperatorExpression.js"

const booleanBinaryOperatorKinds = HashSet.make(
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

export const isBooleanOperatorExpression = (node: ts.Node): node is BooleanOperatorExpression => {
  const isBinaryBooleanOperator =
    ts.isBinaryExpression(node) && HashSet.has(booleanBinaryOperatorKinds, node.operatorToken.kind)

  const unaryOperator = ts.isPrefixUnaryExpression(node) ? node.operator : undefined
  const isUnaryBooleanOperator = strictEqual(ts.SyntaxKind.ExclamationToken)(unaryOperator)
  const isTernaryOperator = ts.isConditionalExpression(node)
  const checks = Array.make(isBinaryBooleanOperator, isUnaryBooleanOperator, isTernaryOperator)

  return Array.some(checks, Boolean)
}
