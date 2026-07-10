import { HashSet, Option } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { unwrapExpression } from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

const logicalOperatorKinds = HashSet.make(
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken
)

const hasLogicalOperator = (expression: ts.BinaryExpression): boolean =>
  HashSet.has(logicalOperatorKinds, expression.operatorToken.kind)

const inlineBooleanConditionMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> => {
    const expression = unwrapExpression(ifStatement.expression)
    const binaryExpression = Option.liftPredicate(ts.isBinaryExpression)(
      expression
    )
    const isLogicalOperatorExpression = Option.exists(
      binaryExpression,
      hasLogicalOperator
    )

    return isLogicalOperatorExpression
      ? [
          match({
            node: expression,
            message:
              "Avoid boolean operators inline in an if statement condition.",
            hint:
              "Extract the expression into a well-named const variable declaration above the if " +
              "statement and use that variable in the if condition."
          })
        ]
      : []
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.IfStatement])(ts.isIfStatement)(
  inlineBooleanConditionMatches
)

export const noInlineBooleanExpressions: Check = check
