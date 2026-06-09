import * as path from "node:path"
import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { childNodeStream, nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

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
        Stream.map((expression) => createMatch(context, expression)),
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
  const parent = node.parent

  if (parent !== undefined) {
    return isBooleanOperatorExpression(parent) || hasBooleanOperatorAncestor(parent)
  }

  return false
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

const isUnaryBooleanOperatorExpression = (node: ts.Node): node is ts.PrefixUnaryExpression => {
  if (ts.isPrefixUnaryExpression(node)) {
    return node.operator === ts.SyntaxKind.ExclamationToken
  }

  return false
}

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

const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  if (!ts.isParenthesizedExpression(expression)) {
    return expression
  }

  return unwrapExpression(expression.expression)
}

const createMatch = (context: RuleContext, expression: ts.Expression): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = expression.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: "Avoid combining more than one boolean operator in a single expression.",
    hint: "Declare multiple constant variables instead of combining operators into a single expression."
  }
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  if (relative.length === 0) {
    return fileName
  }

  return relative
}
