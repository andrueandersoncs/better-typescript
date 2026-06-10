import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { childNodeStream, nodeStream } from "./traverse.js"
import { unwrapExpression } from "./tsNode.js"
import type { Rule } from "./types.js"

const ruleId = "no-multiple-boolean-operators"

type BooleanOperatorExpression =
  | ts.BinaryExpression
  | ts.PrefixUnaryExpression
  | ts.ConditionalExpression

export const noMultipleBooleanOperators: Rule = {
  id: ruleId,
  description: "Disallow combining multiple boolean operators in a single expression.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isExpression),
        Stream.filter(isBooleanOperatorRoot),
        Stream.filter(hasMultipleBooleanOperators),
        Stream.map((expression) =>
          createRuleMatch(context, {
            ruleId,
            node: expression,
            message: "Avoid combining more than one boolean operator in a single expression.",
            hint:
              "Declare multiple constant variables instead of combining operators into a " +
              "single expression."
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const isBooleanOperatorRoot = (expression: ts.Expression): boolean => {
  const expressionUsesBooleanOperator = isBooleanOperatorExpression(expression)
  const hasNoBooleanOperatorAncestor = !hasBooleanOperatorAncestor(expression)

  return expressionUsesBooleanOperator && hasNoBooleanOperatorAncestor
}

const hasMultipleBooleanOperators = (expression: ts.Expression): boolean =>
  booleanOperatorCount(expression) > 1

const booleanOperatorCount = (expression: ts.Expression): number => {
  const unwrapped = unwrapExpression(expression)
  const ownCount = isBooleanOperatorExpression(unwrapped) ? 1 : 0

  if (isNestedExpressionBoundary(unwrapped)) {
    return ownCount
  }

  const childCount = Effect.runSync(
    childNodeStream(unwrapped).pipe(
      Stream.filter(ts.isExpression),
      Stream.map(booleanOperatorCount),
      Stream.runFold(0, (total, count) => total + count)
    )
  )

  return ownCount + childCount
}

const hasBooleanOperatorAncestor = (node: ts.Node): boolean => {
  const parent = Option.fromNullable(node.parent)

  return Option.match(parent, {
    onNone: () => false,
    onSome: (parent) =>
      [isBooleanOperatorExpression(parent), hasBooleanOperatorAncestor(parent)].some(Boolean)
  })
}

const isBooleanOperatorExpression = (
  node: ts.Node
): node is BooleanOperatorExpression => {
  const isBinaryBooleanOperator =
    ts.isBinaryExpression(node) && isBooleanBinaryOperator(node.operatorToken.kind)
  const isUnaryBooleanOperator = isUnaryBooleanOperatorExpression(node)

  const isTernaryOperator = ts.isConditionalExpression(node)

  return [isBinaryBooleanOperator, isUnaryBooleanOperator, isTernaryOperator].some(Boolean)
}

const isUnaryBooleanOperatorExpression = (
  node: ts.Node
): node is ts.PrefixUnaryExpression =>
  Option.match(Option.liftPredicate(ts.isPrefixUnaryExpression)(node), {
    onNone: () => false,
    onSome: (node) => node.operator === ts.SyntaxKind.ExclamationToken
  })

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
