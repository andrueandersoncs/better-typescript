import { Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeDetection } from "@better-typescript/core/engine/check"
import { makeCheck } from "../defineCheck.js"

const strictEqualityOperators = HashSet.make(ts.SyntaxKind.EqualsEqualsEqualsToken)

const hasStrictEqualityOperator = (expression: ts.BinaryExpression) =>
  HashSet.has(strictEqualityOperators, expression.operatorToken.kind)

const isStrictEqualityExpression = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(Option.liftPredicate(ts.isBinaryExpression)(node), Option.exists(hasStrictEqualityOperator))

const strictEqualityMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const strictEqualityMatch = (expression: ts.BinaryExpression): ReadonlyArray<Detection> =>
    pipe(
      {
        node: expression,
        message: "Avoid raw strict equality (===).",
        hint:
          "Import Equivalence from effect and replace this comparison with " +
          "Equivalence.strictEqual<YourType>()(left, right)."
      },
      match,
      Array.of
    )

  return strictEqualityMatch
}

const binaryExpressionKinds = Array.of(ts.SyntaxKind.BinaryExpression)

export const preferEquivalenceStrictEqual = makeCheck(
  "prefer-equivalence-strict-equal",
  binaryExpressionKinds,
  isStrictEqualityExpression,
  strictEqualityMatches
)
