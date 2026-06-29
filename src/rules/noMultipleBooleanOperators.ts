import { HashSet, Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { astChildren } from "./traverse.js"
import { unwrapExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

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

  const childCount = astChildren(unwrapped)
    .filter(ts.isExpression)
    .reduce(addBooleanOperatorCount, 0)

  return ownCount + childCount
}

const isOrHasBooleanOperatorAncestor = (parent: ts.Node): boolean =>
  [
    isBooleanOperatorExpression(parent),
    hasBooleanOperatorAncestor(parent)
  ].some(Boolean)

const hasBooleanOperatorAncestor = (node: ts.Node): boolean => {
  const parent = Option.fromNullable(node.parent)

  return Option.exists(parent, isOrHasBooleanOperatorAncestor)
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

const multipleBooleanOperatorMatches = (
  expression: BooleanOperatorExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const expressionUsesBooleanOperator = isBooleanOperatorExpression(expression)
  const hasNoBooleanOperatorAncestor = !hasBooleanOperatorAncestor(expression)
  const hasMultiple = booleanOperatorCount(expression) > 1
  const isReportableRoot = [
    expressionUsesBooleanOperator,
    hasNoBooleanOperatorAncestor,
    hasMultiple
  ].every(Boolean)

  return isReportableRoot
    ? [
        createRuleMatch(context, {
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

const check = onNode(
  [
    ts.SyntaxKind.BinaryExpression,
    ts.SyntaxKind.PrefixUnaryExpression,
    ts.SyntaxKind.ConditionalExpression
  ],
  isBooleanOperatorExpression,
  multipleBooleanOperatorMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/access.ts",
  code: `const canEdit = isAdmin && isActive || isOwner`
})

const goodExample = new ExampleSnippet({
  filePath: "src/access.ts",
  code: `const hasAdminAccess = isAdmin && isActive
const canEdit = hasAdminAccess || isOwner`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noMultipleBooleanOperators = new Rule({
  id: ruleId,
  description:
    "Disallow combining multiple boolean operators in a single expression.",
  example,
  check
})
