import * as ts from "typescript"
import { carrierWords } from "./carrierWords.js"
import { symbolIdentifierWords } from "./symbolIdentifierWords.js"
import { pipe, Array, Option, HashSet } from "effect"

export const normalizedSymbolName = (symbol: ts.Symbol) =>
  pipe(symbolIdentifierWords(symbol), Array.join(""))

export const symbolHasCarrierName = (symbol: Option.Option<ts.Symbol>) => {
  const nameIsCarrier = (name: string) => HashSet.has(carrierWords, name)

  return pipe(symbol, Option.map(normalizedSymbolName), Option.exists(nameIsCarrier))
}

export const isNamedCarrierType = (type: ts.Type) => {
  const aliasCarrier = pipe(Option.fromNullishOr(type.aliasSymbol), symbolHasCarrierName)
  const directSymbol = type.getSymbol()
  const directCarrier = pipe(Option.fromNullishOr(directSymbol), symbolHasCarrierName)

  return aliasCarrier || directCarrier
}
