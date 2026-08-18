import { Array, Option, pipe, Struct, Schema } from "effect"
import * as ts from "typescript"
import { nodeScanner } from "../scanner/nodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { isFirstPartySymbol } from "../support/isFirstPartySymbol.js"
import { strictEqual } from "../equivalence.js"

// NoInstanceofFact exists because its fields form one stable data contract used by the linter.
export const NoInstanceofFact = Schema.Struct({
  className: Schema.String
})

export interface NoInstanceofFact extends Schema.Schema.Type<typeof NoInstanceofFact> {}

const isInstanceofOperator = (expr: ts.BinaryExpression) =>
  strictEqual(ts.SyntaxKind.InstanceOfKeyword)(expr.operatorToken.kind)

const isInstanceofExpression = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(Option.liftPredicate(ts.isBinaryExpression)(node), Option.exists(isInstanceofOperator))

const className = Struct.get<ts.Symbol, "name">("name")

const binaryExpressionKinds = Array.of(ts.SyntaxKind.BinaryExpression)

const instanceofMatches = (context: MatchContext) => {
  const matchInstanceofExpression = (expression: ts.BinaryExpression) => {
    const symbolAtLocation = context.checker.getSymbolAtLocation(expression.right)
    const symbol = Option.fromNullishOr(symbolAtLocation)

    const factForSymbol = (resolved: ts.Symbol) => {
      const resolvedClassName = className(resolved)

      return NoInstanceofFact.make({
        className: resolvedClassName
      })
    }

    const matchWithFact = (fact: NoInstanceofFact) => makeNodeMatch(expression, fact)

    return pipe(
      symbol,
      Option.filter(isFirstPartySymbol),
      Option.map(factForSymbol),
      Option.map(matchWithFact),
      Option.toArray
    )
  }

  return matchInstanceofExpression
}

export const noInstanceofScanner =
  nodeScanner(binaryExpressionKinds)(isInstanceofExpression)(instanceofMatches)
