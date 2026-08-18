import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"

export const canonicalSymbol = (checker: ts.TypeChecker) => (symbol: ts.Symbol) =>
  strictEqual(0)(symbol.flags & ts.SymbolFlags.Alias) ? symbol : checker.getAliasedSymbol(symbol)
