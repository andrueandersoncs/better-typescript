import { Option, pipe } from "effect"
import type * as ts from "typescript"
import { canonicalSymbol } from "../../support/canonicalSymbol.js"

export const symbolAt = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(
    checker.getSymbolAtLocation(node),
    Option.fromNullishOr,
    Option.map(canonicalSymbol(checker))
  )
