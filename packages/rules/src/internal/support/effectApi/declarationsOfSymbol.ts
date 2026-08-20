import { emptyDeclarations } from "../emptyDeclarations.js"
import type * as ts from "typescript"
import { symbolDeclarations } from "../symbolDeclarations.js"

export const declarationsOfSymbol = (symbol: ts.Symbol): ReadonlyArray<ts.Declaration> =>
  symbolDeclarations(symbol) ?? emptyDeclarations
