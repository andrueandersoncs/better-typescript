import { Array } from "effect"
import type * as ts from "typescript"
import { symbolDeclarations } from "../../support/symbolDeclarations.js"

export const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()

export const declarationsOfSymbol = (symbol: ts.Symbol): ReadonlyArray<ts.Declaration> =>
  symbolDeclarations(symbol) ?? emptyDeclarations
