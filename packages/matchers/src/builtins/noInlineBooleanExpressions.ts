import { Array, Function, HashSet, Option, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"
import { unwrapExpression } from "../support/tsNode.js"

// NoInlineBooleanExpressionsFact is empty payload because guidance and matchers share identity.
export const NoInlineBooleanExpressionsFact = Schema.Struct({})

export interface NoInlineBooleanExpressionsFact extends Schema.Schema.Type<
  typeof NoInlineBooleanExpressionsFact
> {}

// emptyNoInlineBooleanExpressionsFact is empty because guidance and matchers share identity.
export const emptyNoInlineBooleanExpressionsFact = NoInlineBooleanExpressionsFact.make({})

const logicalOperatorKinds = HashSet.make(
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken
)

const hasLogicalOperator = (expression: ts.BinaryExpression) =>
  HashSet.has(logicalOperatorKinds, expression.operatorToken.kind)

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

const matchInlineBooleanExpression = (ifStatement: ts.IfStatement) => {
  const expression = unwrapExpression(ifStatement.expression)
  const binaryExpression = Option.liftPredicate(ts.isBinaryExpression)(expression)
  const isLogicalOperatorExpression = Option.exists(binaryExpression, hasLogicalOperator)

  if (!isLogicalOperatorExpression) {
    return Array.empty()
  }

  const match = nodeMatch(expression, emptyNoInlineBooleanExpressionsFact)

  return Array.of(match)
}

const noInlineBooleanExpressionsMatches = Function.constant(matchInlineBooleanExpression)

export const noInlineBooleanExpressionsMatcher = nodeMatcher(ifStatementKinds)(ts.isIfStatement)(
  noInlineBooleanExpressionsMatches
)
