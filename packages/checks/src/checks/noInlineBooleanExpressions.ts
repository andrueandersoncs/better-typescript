import { Array, HashSet, Option } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { unwrapExpression } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

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

    const value45 = match({
      node: expression,
      message: "Avoid boolean operators inline in an if statement condition.",
      hint:
        "Extract the expression into a well-named const variable declaration above the if " +
        "statement and use that variable in the if condition."
    })

    return isLogicalOperatorExpression ? Array.of(value45) : Array.empty()
  }

  return matches
}

const values46 = Array.of(ts.SyntaxKind.IfStatement)

const check = nodeCheck(values46)(ts.isIfStatement)(
  inlineBooleanConditionMatches
)

export const noInlineBooleanExpressions: Check = check

export const noInlineBooleanExpressionsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-inline-boolean-expressions")
