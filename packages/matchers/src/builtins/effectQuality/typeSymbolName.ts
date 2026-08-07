import { Function, Option, pipe, Struct } from "effect"

import * as ts from "typescript"

export const typeSymbolName = (type: ts.Type) => {
  const rawSymbol = type.getSymbol()
  const symbol = Option.fromNullishOr(rawSymbol)
  const alias = Option.fromNullishOr(type.aliasSymbol)

  return pipe(
    symbol,
    Option.orElse(Function.constant(alias)),
    Option.map(Struct.get("name")),
    Option.getOrElse(Function.constant(""))
  )
}
