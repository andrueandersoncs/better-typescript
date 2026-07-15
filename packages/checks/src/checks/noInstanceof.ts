import { Array, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { isFirstPartySymbol } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const isInstanceofOperator = (expr: ts.BinaryExpression): boolean =>
  expr.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword

const isInstanceofExpression = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(Option.liftPredicate(ts.isBinaryExpression)(node), Option.exists(isInstanceofOperator))

const className = Struct.get("name")

const instanceofMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

  const matches = (expression: ts.BinaryExpression): ReadonlyArray<Detection> => {
    const symbolAtLocation = checker.getSymbolAtLocation(expression.right)
    const symbol = Option.fromNullable(symbolAtLocation)

    return pipe(
      symbol,
      Option.filter(isFirstPartySymbol),
      Option.map((symbol) => {
        const name = className(symbol)

        return match({
          node: expression,
          message: `Avoid instanceof for the first-party class "${name}".`,
          hint:
            `Use Schema.is(${name})(value) or a Schema-based type guard instead of instanceof. ` +
            "Schema.is is structural, works across realms, and stays consistent with " +
            "the Effect type system."
        })
      }),
      Option.toArray
    )
  }

  return matches
}

const binaryExpressionKinds = Array.of(ts.SyntaxKind.BinaryExpression)

const check = nodeCheck(binaryExpressionKinds)(isInstanceofExpression)(instanceofMatches)

export const noInstanceof: Check = check

export const noInstanceofExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-instanceof")
