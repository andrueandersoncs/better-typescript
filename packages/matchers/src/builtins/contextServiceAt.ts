import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "../matcher/matchContext.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { isContextServiceDeclaration } from "./contextServiceDeclaration.js"
import { symbolOptionAt } from "./symbolOptionAt.js"

export const isContextServiceAt = (context: MatchContext, expression: ts.Expression) => {
  const declarations = (symbol: ts.Symbol) => symbol.getDeclarations() ?? Array.empty()

  return pipe(
    unwrapTransparentExpression(expression),
    Option.liftPredicate(ts.isIdentifier),
    Option.flatMap(symbolOptionAt(context.checker)),
    Option.map(declarations),
    Option.exists(Array.some(isContextServiceDeclaration(context)))
  )
}
