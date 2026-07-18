import { Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapExpression } from "./support/tsNode.js"
import { astChildren } from "@better-typescript/core/engine/sources"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"

// BooleanOperatorExpression is shared boolean syntax because owners need one vocabulary.
export type BooleanOperatorExpression =
  ts.BinaryExpression | ts.PrefixUnaryExpression | ts.ConditionalExpression

const isBooleanOperatorExpression = (node: ts.Node): node is BooleanOperatorExpression => {
  const isBinaryBooleanOperator =
    ts.isBinaryExpression(node) && HashSet.has(booleanBinaryOperatorKinds, node.operatorToken.kind)

  const unaryOperator = ts.isPrefixUnaryExpression(node) ? node.operator : undefined
  const isUnaryBooleanOperator = unaryOperator === ts.SyntaxKind.ExclamationToken
  const isTernaryOperator = ts.isConditionalExpression(node)
  const checks = Array.make(isBinaryBooleanOperator, isUnaryBooleanOperator, isTernaryOperator)

  return Array.some(checks, Boolean)
}

const addBooleanOperatorCount = (total: number, child: ts.Expression): number =>
  total + booleanOperatorCount(child)

const booleanOperatorCount = (expression: ts.Expression): number => {
  const unwrapped = unwrapExpression(expression)
  const ownCount = isBooleanOperatorExpression(unwrapped) ? 1 : 0

  if (HashSet.has(nestedExpressionBoundaryKinds, unwrapped.kind)) {
    return ownCount
  }

  // Count ternary conditions separately because prefer-conditional-return mandates `cond ? x : y`.
  const countedChildren = ts.isConditionalExpression(unwrapped)
    ? Array.make(unwrapped.whenTrue, unwrapped.whenFalse)
    : astChildren(unwrapped)

  const filtered = Array.filter(countedChildren, ts.isExpression)
  const childCount = Array.reduce(filtered, 0, addBooleanOperatorCount)

  return ownCount + childCount
}

const isOrHasBooleanOperatorAncestor = (parent: ts.Node): boolean => {
  const isBooleanOperator = isBooleanOperatorExpression(parent)
  const hasAncestor = hasBooleanOperatorAncestor(parent)
  const conditions = Array.make(isBooleanOperator, hasAncestor)

  return Array.some(conditions, Boolean)
}

const hasBooleanOperatorAncestor = (node: ts.Node): boolean => {
  const parent = Option.fromNullishOr(node.parent)

  const isConditionEdge = pipe(
    parent,
    Option.filter(ts.isConditionalExpression),
    Option.exists((conditional) => conditional.condition === node)
  )

  const hasCountedAncestor = Option.exists(parent, isOrHasBooleanOperatorAncestor)
  const checks = Array.make(!isConditionEdge, hasCountedAncestor)
  return Array.every(checks, Boolean)
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

const multipleBooleanOperatorMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (expression: BooleanOperatorExpression): ReadonlyArray<Detection> => {
    const expressionUsesBooleanOperator = isBooleanOperatorExpression(expression)
    const hasNoBooleanOperatorAncestor = !hasBooleanOperatorAncestor(expression)
    const hasMultiple = booleanOperatorCount(expression) > 1

    const checks = Array.make(
      expressionUsesBooleanOperator,
      hasNoBooleanOperatorAncestor,
      hasMultiple
    )

    const isReportableRoot = Array.every(checks, Boolean)

    const detection = match({
      node: expression,
      message: "Avoid combining more than one boolean operator in a single expression.",
      hint:
        "Declare multiple constant variables instead of combining operators into a " +
        "single expression."
    })

    return isReportableRoot ? Array.of(detection) : Array.empty()
  }

  return matches
}

const kinds = Array.make(
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.ConditionalExpression
)

export const noMultipleBooleanOperators = makeCheck(
  "no-multiple-boolean-operators",
  kinds,
  isBooleanOperatorExpression,
  multipleBooleanOperatorMatches
)
