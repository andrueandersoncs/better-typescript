import { Array } from "effect"
import type * as ts from "typescript"
import { symbolEquivalence } from "./symbolEquivalence.js"

export const dedupeSymbols = (symbols: ReadonlyArray<ts.Symbol>) =>
  Array.dedupeWith(symbols, symbolEquivalence)
