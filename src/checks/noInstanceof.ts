import { Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { isFirstPartySymbol } from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"

const isInstanceofOperator = (expr: ts.BinaryExpression): boolean =>
  expr.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword

const isInstanceofExpression = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(
    Option.liftPredicate(ts.isBinaryExpression)(node),
    Option.exists(isInstanceofOperator)
  )

const className = Struct.get("name")

const instanceofDetection =
  (match: MakeDetection) =>
  (expression: ts.BinaryExpression) =>
  (symbol: ts.Symbol): Detection => {
    const name = className(symbol)

    return match({
      node: expression,
      message: `Avoid instanceof for the first-party class "${name}".`,
      hint:
        `Use Schema.is(${name})(value) or a Schema-based type guard instead of instanceof. ` +
        "Schema.is is structural, works across realms, and stays consistent with " +
        "the Effect type system."
    })
  }

const instanceofMatches = (context: CheckContext) => {
  const checker = context.checker
  const ruleMatch = instanceofDetection(detection(context))

  const matches = (
    expression: ts.BinaryExpression
  ): ReadonlyArray<Detection> => {
    const symbolAtLocation = checker.getSymbolAtLocation(expression.right)
    const symbol = Option.fromNullable(symbolAtLocation)

    return pipe(
      symbol,
      Option.filter(isFirstPartySymbol),
      Option.map(ruleMatch(expression)),
      Option.toArray
    )
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.BinaryExpression])(
  isInstanceofExpression
)(instanceofMatches)

export const noInstanceof: Check = check
