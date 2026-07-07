import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { astChildren } from "../detectors/sources.js"
import { unwrapExpression } from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

type BooleanOperatorExpression =
  ts.BinaryExpression | ts.PrefixUnaryExpression | ts.ConditionalExpression

const isBooleanOperatorExpression = (
  node: ts.Node
): node is BooleanOperatorExpression => {
  const isBinaryBooleanOperator =
    ts.isBinaryExpression(node) &&
    HashSet.has(booleanBinaryOperatorKinds, node.operatorToken.kind)
  const unaryOperator = ts.isPrefixUnaryExpression(node)
    ? node.operator
    : undefined
  const isUnaryBooleanOperator =
    unaryOperator === ts.SyntaxKind.ExclamationToken

  const isTernaryOperator = ts.isConditionalExpression(node)

  return [
    isBinaryBooleanOperator,
    isUnaryBooleanOperator,
    isTernaryOperator
  ].some(Boolean)
}

const addBooleanOperatorCount = (total: number, child: ts.Expression): number =>
  total + booleanOperatorCount(child)

const booleanOperatorCount = (expression: ts.Expression): number => {
  const unwrapped = unwrapExpression(expression)
  const ownCount = isBooleanOperatorExpression(unwrapped) ? 1 : 0

  if (HashSet.has(nestedExpressionBoundaryKinds, unwrapped.kind)) {
    return ownCount
  }

  // A ternary's condition is its own counting root: prefer-conditional-return mandates `cond ? x : y`, so condition operators are counted at the condition, not the ternary.
  const countedChildren = ts.isConditionalExpression(unwrapped)
    ? [unwrapped.whenTrue, unwrapped.whenFalse]
    : astChildren(unwrapped)
  const childCount = countedChildren
    .filter(ts.isExpression)
    .reduce(addBooleanOperatorCount, 0)

  return ownCount + childCount
}

const isConditionOf =
  (node: ts.Node) =>
  (parent: ts.ConditionalExpression): boolean =>
    parent.condition === node

const isConditionEdge = (node: ts.Node): boolean =>
  pipe(
    Option.fromNullable<ts.Node>(node.parent),
    Option.filter(ts.isConditionalExpression),
    Option.exists(isConditionOf(node))
  )

const isOrHasBooleanOperatorAncestor = (parent: ts.Node): boolean =>
  [
    isBooleanOperatorExpression(parent),
    hasBooleanOperatorAncestor(parent)
  ].some(Boolean)

const hasBooleanOperatorAncestor = (node: ts.Node): boolean => {
  const parent = Option.fromNullable(node.parent)
  const isConditionEdge = pipe(
    parent,
    Option.filter(ts.isConditionalExpression),
    Option.exists(isConditionOf(node))
  )
  const hasCountedAncestor = Option.exists(
    parent,
    isOrHasBooleanOperatorAncestor
  )

  return [!isConditionEdge, hasCountedAncestor].every(Boolean)
}

const booleanBinaryOperatorKinds = HashSet.make(
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

const nestedExpressionBoundaryKinds = HashSet.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ClassExpression
)

// The context stage runs once per file, so match is shared by every boolean expression the report wiring feeds to matches.
const multipleBooleanOperatorMatches = (context: RuleContext) => {
  const match = detection(context)

  const matches = (
    expression: BooleanOperatorExpression
  ): ReadonlyArray<Detection> => {
    const expressionUsesBooleanOperator =
      isBooleanOperatorExpression(expression)
    const hasNoBooleanOperatorAncestor = !hasBooleanOperatorAncestor(expression)
    const hasMultiple = booleanOperatorCount(expression) > 1
    const isReportableRoot = [
      expressionUsesBooleanOperator,
      hasNoBooleanOperatorAncestor,
      hasMultiple
    ].every(Boolean)

    return isReportableRoot
      ? [
          match({
            node: expression,
            message:
              "Avoid combining more than one boolean operator in a single expression.",
            hint:
              "Declare multiple constant variables instead of combining operators into a " +
              "single expression."
          })
        ]
      : []
  }

  return matches
}

const check = nodeCheck([
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.ConditionalExpression
])(isBooleanOperatorExpression)(multipleBooleanOperatorMatches)

export const noMultipleBooleanOperators: RuleCheck = check
