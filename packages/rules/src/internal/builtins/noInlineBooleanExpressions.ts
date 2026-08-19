import { Array, Function, HashSet, Option, Schema } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import { unwrapExpression } from "../support/unwrapExpression.js"

// NoInlineBooleanExpressionsFact exists because its fields form one stable data contract used by the linter.
export const NoInlineBooleanExpressionsFact = Schema.Struct({})

export interface NoInlineBooleanExpressionsFact extends Schema.Schema.Type<
  typeof NoInlineBooleanExpressionsFact
> {}

// emptyNoInlineBooleanExpressionsFact exists because its fields form one stable data contract used by the linter.
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

  const match = makeNodeMatch(expression, emptyNoInlineBooleanExpressionsFact)

  return Array.of(match)
}

const noInlineBooleanExpressionsMatches = Function.constant(matchInlineBooleanExpression)

export const noInlineBooleanExpressionsScanner = makeNodeScanner(ifStatementKinds)(
  ts.isIfStatement
)(noInlineBooleanExpressionsMatches)
