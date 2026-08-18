import { Option, flow } from "effect"
import type * as ts from "typescript"
import { canonicalSymbol } from "./canonicalSymbol.js"
import { rawSymbolAt } from "./rawSymbolAt.js"

export const resolvedSymbolAt = (checker: ts.TypeChecker) =>
  flow(rawSymbolAt(checker), Option.map(canonicalSymbol(checker)))
