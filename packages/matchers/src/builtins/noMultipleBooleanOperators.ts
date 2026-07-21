import { Array, Function, HashSet, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"
import { unwrapExpression } from "../support/tsNode.js"
import { astChildren } from "../sources/sources.js"
import { strictEqual } from "../equivalence.js"

// BooleanOperatorExpression is a local syntax union because matchers need one narrowed node shape.
export type BooleanOperatorExpression =
  ts.BinaryExpression | ts.PrefixUnaryExpression | ts.ConditionalExpression

// NoMultipleBooleanOperatorsFact is empty payload because guidance and matchers share identity.
export const NoMultipleBooleanOperatorsFact = Schema.Struct({})

export interface NoMultipleBooleanOperatorsFact extends Schema.Schema.Type<
  typeof NoMultipleBooleanOperatorsFact
> {}

// emptyNoMultipleBooleanOperatorsFact is empty because guidance and matchers share identity.
export const emptyNoMultipleBooleanOperatorsFact = NoMultipleBooleanOperatorsFact.make({})

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

const isBooleanOperatorExpression = (node: ts.Node): node is BooleanOperatorExpression => {
  const isBinaryBooleanOperator =
    ts.isBinaryExpression(node) && HashSet.has(booleanBinaryOperatorKinds, node.operatorToken.kind)

  const unaryOperator = ts.isPrefixUnaryExpression(node) ? node.operator : undefined
  const isUnaryBooleanOperator = strictEqual(ts.SyntaxKind.ExclamationToken)(unaryOperator)
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
    Option.exists((conditional) => {
      const isConditionNode = strictEqual(node)(conditional.condition)

      return isConditionNode
    })
  )

  const hasCountedAncestor = Option.exists(parent, isOrHasBooleanOperatorAncestor)
  const checks = Array.make(!isConditionEdge, hasCountedAncestor)
  return Array.every(checks, Boolean)
}

const kinds = Array.make(
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.ConditionalExpression
)

const matchMultipleBooleanOperators = (expression: BooleanOperatorExpression) => {
  const expressionUsesBooleanOperator = isBooleanOperatorExpression(expression)
  const hasNoBooleanOperatorAncestor = !hasBooleanOperatorAncestor(expression)
  const hasMultiple = booleanOperatorCount(expression) > 1

  const checks = Array.make(
    expressionUsesBooleanOperator,
    hasNoBooleanOperatorAncestor,
    hasMultiple
  )

  const isReportableRoot = Array.every(checks, Boolean)

  if (!isReportableRoot) {
    return Array.empty()
  }

  const match = nodeMatch(expression, emptyNoMultipleBooleanOperatorsFact)

  return Array.of(match)
}

const noMultipleBooleanOperatorsMatches = Function.constant(matchMultipleBooleanOperators)

export const noMultipleBooleanOperatorsMatcher = nodeMatcher(kinds)(isBooleanOperatorExpression)(
  noMultipleBooleanOperatorsMatches
)
