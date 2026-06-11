import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { astChildren } from "./traverse.js"
import { unwrapExpression } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-multiple-boolean-operators"

type BooleanOperatorExpression =
  | ts.BinaryExpression
  | ts.PrefixUnaryExpression
  | ts.ConditionalExpression

const isBooleanOperatorExpression = (
  node: ts.Node
): node is BooleanOperatorExpression => {
  const isBinaryBooleanOperator =
    ts.isBinaryExpression(node) && isBooleanBinaryOperator(node.operatorToken.kind)
  const isUnaryBooleanOperator = isUnaryBooleanOperatorExpression(node)

  const isTernaryOperator = ts.isConditionalExpression(node)

  return [isBinaryBooleanOperator, isUnaryBooleanOperator, isTernaryOperator].some(Boolean)
}

const isBooleanOperatorRoot = (expression: ts.Expression): boolean => {
  const expressionUsesBooleanOperator = isBooleanOperatorExpression(expression)
  const hasNoBooleanOperatorAncestor = !hasBooleanOperatorAncestor(expression)

  return expressionUsesBooleanOperator && hasNoBooleanOperatorAncestor
}

const hasMultipleBooleanOperators = (expression: ts.Expression): boolean =>
  booleanOperatorCount(expression) > 1

const addBooleanOperatorCount = (total: number, child: ts.Expression): number =>
  total + booleanOperatorCount(child)

const booleanOperatorCount = (expression: ts.Expression): number => {
  const unwrapped = unwrapExpression(expression)
  const ownCount = isBooleanOperatorExpression(unwrapped) ? 1 : 0

  if (isNestedExpressionBoundary(unwrapped)) {
    return ownCount
  }

  const childCount = astChildren(unwrapped)
    .filter(ts.isExpression)
    .reduce(addBooleanOperatorCount, 0)

  return ownCount + childCount
}

const isOrHasBooleanOperatorAncestor = (parent: ts.Node): boolean =>
  [isBooleanOperatorExpression(parent), hasBooleanOperatorAncestor(parent)].some(Boolean)

const hasBooleanOperatorAncestor = (node: ts.Node): boolean =>
  Option.exists(Option.fromNullable(node.parent), isOrHasBooleanOperatorAncestor)

const isExclamationOperator = (node: ts.PrefixUnaryExpression): boolean =>
  node.operator === ts.SyntaxKind.ExclamationToken

const isUnaryBooleanOperatorExpression = (
  node: ts.Node
): node is ts.PrefixUnaryExpression =>
  Option.exists(Option.liftPredicate(ts.isPrefixUnaryExpression)(node), isExclamationOperator)

const booleanBinaryOperatorKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
])

const isBooleanBinaryOperator = (kind: ts.SyntaxKind): boolean =>
  booleanBinaryOperatorKinds.has(kind)

const nestedExpressionBoundaryKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ClassExpression
])

const isNestedExpressionBoundary = (expression: ts.Expression): boolean =>
  nestedExpressionBoundaryKinds.has(expression.kind)

const multipleBooleanOperatorMatches = (
  expression: BooleanOperatorExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const isReportableRoot = [
    isBooleanOperatorRoot(expression),
    hasMultipleBooleanOperators(expression)
  ].every(Boolean)

  return isReportableRoot
    ? [
        createRuleMatch(context, {
          ruleId,
          node: expression,
          message: "Avoid combining more than one boolean operator in a single expression.",
          hint:
            "Declare multiple constant variables instead of combining operators into a " +
            "single expression."
        })
      ]
    : []
}

export const noMultipleBooleanOperators = new Rule({
  id: ruleId,
  description: "Disallow combining multiple boolean operators in a single expression.",
  check: onNode(
    [
      ts.SyntaxKind.BinaryExpression,
      ts.SyntaxKind.PrefixUnaryExpression,
      ts.SyntaxKind.ConditionalExpression
    ],
    isBooleanOperatorExpression,
    multipleBooleanOperatorMatches
  )
})
