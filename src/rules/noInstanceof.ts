import { Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { isFirstPartySymbol } from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { MakeDetection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const isInstanceofOperator = (expr: ts.BinaryExpression): boolean =>
  expr.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword

const isInstanceofExpression = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(
    Option.liftPredicate(ts.isBinaryExpression)(node),
    Option.exists(isInstanceofOperator)
  )

const className: (symbol: ts.Symbol) => string = Struct.get("name")

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

// The context stage runs once per file, so every partial below is shared by all instanceof expressions the report wiring feeds to matches.
const instanceofMatches = (context: RuleContext) => {
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

export const noInstanceof: RuleCheck = check
