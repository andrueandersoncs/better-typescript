import { Array, Option, pipe, Struct, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { isFirstPartySymbol } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

// NoInstanceofFact names the class because guidance cites the runtime check target.
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
  const checker = context.checker

  const matchInstanceofExpression = (expression: ts.BinaryExpression) => {
    const symbolAtLocation = checker.getSymbolAtLocation(expression.right)
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

export const noInstanceofMatcher =
  nodeMatcher(binaryExpressionKinds)(isInstanceofExpression)(instanceofMatches)
