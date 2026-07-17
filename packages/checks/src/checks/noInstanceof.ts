import { Array, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { isFirstPartySymbol } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { defineCheck } from "../defineCheck.js"
import { detection } from "@better-typescript/core/engine/check"

const isInstanceofOperator = (expr: ts.BinaryExpression) =>
  expr.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword

const isInstanceofExpression = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(Option.liftPredicate(ts.isBinaryExpression)(node), Option.exists(isInstanceofOperator))

const className = Struct.get<ts.Symbol, "name">("name")

const instanceofMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

  const matches = (expression: ts.BinaryExpression): ReadonlyArray<Detection> => {
    const symbolAtLocation = checker.getSymbolAtLocation(expression.right)
    const symbol = Option.fromNullishOr(symbolAtLocation)

    return pipe(
      symbol,
      Option.filter(isFirstPartySymbol),
      Option.map((symbol) => {
        const name = className(symbol)

        return match({
          node: expression,
          message: `Avoid instanceof for the first-party class "${name}".`,
          hint:
            "Use a stable discriminant, an explicit structural type guard, or Schema.is with a " +
            "structurally defined Schema such as Schema.Struct. Schema.is on Schema.Class retains " +
            "constructor semantics, so it does not make a class check structural or cross-realm safe."
        })
      }),
      Option.toArray
    )
  }

  return matches
}

const binaryExpressionKinds = Array.of(ts.SyntaxKind.BinaryExpression)

export const noInstanceof = defineCheck(
  "no-instanceof",
  binaryExpressionKinds,
  isInstanceofExpression,
  instanceofMatches
)
