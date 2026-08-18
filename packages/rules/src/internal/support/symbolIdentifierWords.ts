import * as ts from "typescript"
import { identifierWords } from "./matchIdentifierWords.js"
import { Function } from "effect"

export const symbolName = (symbol: ts.Symbol) => symbol.getName()

export const symbolIdentifierWords = Function.compose(symbolName, identifierWords)
