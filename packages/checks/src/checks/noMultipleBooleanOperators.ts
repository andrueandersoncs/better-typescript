import { Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { unwrapExpression } from "./support/tsNode.js"
import { astChildren } from "@better-typescript/core/engine/sources"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

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

  const values55 = Array.make(
    isBinaryBooleanOperator,
    isUnaryBooleanOperator,
    isTernaryOperator
  )

  return Array.some(values55, Boolean)
}

const addBooleanOperatorCount = (total: number, child: ts.Expression): number =>
  total + booleanOperatorCount(child)

const booleanOperatorCount = (expression: ts.Expression): number => {
  const unwrapped = unwrapExpression(expression)
  const ownCount = isBooleanOperatorExpression(unwrapped) ? 1 : 0

  if (HashSet.has(nestedExpressionBoundaryKinds, unwrapped.kind)) {
    return ownCount
  }

  // Count a ternary condition separately because prefer-conditional-return mandates `cond ? x : y`.
  const countedChildren = ts.isConditionalExpression(unwrapped)
    ? Array.make(unwrapped.whenTrue, unwrapped.whenFalse)
    : astChildren(unwrapped)

  const filtered = Array.filter(countedChildren, ts.isExpression)
  const childCount = Array.reduce(filtered, 0, addBooleanOperatorCount)

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

const isOrHasBooleanOperatorAncestor = (parent: ts.Node): boolean => {
  const value56 = isBooleanOperatorExpression(parent)
  const value57 = hasBooleanOperatorAncestor(parent)
  const conditions = Array.make(value56, value57)

  return Array.some(conditions, Boolean)
}

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

  const values58 = Array.make(!isConditionEdge, hasCountedAncestor)
  return Array.every(values58, Boolean)
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
  const match = detection(context)

  const matches = (
    expression: BooleanOperatorExpression
  ): ReadonlyArray<Detection> => {
    const expressionUsesBooleanOperator =
      isBooleanOperatorExpression(expression)

    const hasNoBooleanOperatorAncestor = !hasBooleanOperatorAncestor(expression)
    const hasMultiple = booleanOperatorCount(expression) > 1

    const values59 = Array.make(
      expressionUsesBooleanOperator,
      hasNoBooleanOperatorAncestor,
      hasMultiple
    )

    const isReportableRoot = Array.every(values59, Boolean)

    const value60 = match({
      node: expression,
      message:
        "Avoid combining more than one boolean operator in a single expression.",
      hint:
        "Declare multiple constant variables instead of combining operators into a " +
        "single expression."
    })

    return isReportableRoot ? Array.of(value60) : Array.empty()
  }

  return matches
}

const values61 = Array.make(
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.ConditionalExpression
)

const check = nodeCheck(values61)(isBooleanOperatorExpression)(
  multipleBooleanOperatorMatches
)

export const noMultipleBooleanOperators: Check = check

export const noMultipleBooleanOperatorsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-multiple-boolean-operators")
