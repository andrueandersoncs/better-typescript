import { Function, Option, pipe } from "effect"
import * as ts from "typescript"

export const typeSymbol = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const aliasSymbol = Option.fromNullishOr(type.aliasSymbol)
  const symbol = type.getSymbol()
  const directSymbol = Option.fromNullishOr(symbol)

  return pipe(
    aliasSymbol,
    Option.orElse(Function.constant(directSymbol)),
    Option.map((symbol) => {
      const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

      return isAlias ? checker.getAliasedSymbol(symbol) : symbol
    })
  )
}
