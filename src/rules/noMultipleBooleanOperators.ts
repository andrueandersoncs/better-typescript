import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { astChildren } from "./traverse.js"
import { unwrapExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, Finding } from "./types.js"

const ruleId = "no-multiple-boolean-operators"

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

// The context stage runs once per file, so match is shared by every boolean expression the dispatcher feeds to matches.
const multipleBooleanOperatorMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)

  const matches = (
    expression: BooleanOperatorExpression
  ): ReadonlyArray<Finding> => {
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
            ruleId,
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

const check = onNode([
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.ConditionalExpression
])(isBooleanOperatorExpression)(multipleBooleanOperatorMatches)

const badExample = new ExampleSnippet({
  filePath: "src/access.ts",
  code: `declare const isAdmin: boolean
declare const isActive: boolean
declare const isOwner: boolean

export const canEdit = isAdmin && isActive || isOwner`
})

const goodExample = new ExampleSnippet({
  filePath: "src/access.ts",
  code: `declare const isAdmin: boolean
declare const isActive: boolean
declare const isOwner: boolean

const hasAdminAccess = isAdmin && isActive
export const canEdit = hasAdminAccess || isOwner`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noMultipleBooleanOperators = new Rule({
  id: ruleId,
  description:
    "Disallow combining multiple boolean operators in a single expression. A ternary's " +
    "condition counts as its own expression, so `a === b ? x : y` is a single choice over " +
    "a single comparison.",
  example,
  check
})
