import * as ts from "typescript"
import { constantEmptyStrings } from "./constantEmptyStrings.js"
import { symbolIdentifierWords } from "./symbolIdentifierWords.js"
import { Option, pipe, Array } from "effect"

export const symbolResultWords = (symbol: Option.Option<ts.Symbol>): ReadonlyArray<string> =>
  pipe(symbol, Option.map(symbolIdentifierWords), Option.getOrElse(constantEmptyStrings))

export const typeResultWords = (type: ts.Type): ReadonlyArray<string> => {
  const directSymbol = type.getSymbol()
  const aliasWords = pipe(Option.fromNullishOr(type.aliasSymbol), symbolResultWords)
  const directWords = pipe(Option.fromNullishOr(directSymbol), symbolResultWords)

  return pipe(aliasWords, Array.appendAll(directWords), Array.dedupe)
}
