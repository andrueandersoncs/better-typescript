import { Array, Function, Option, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { resolvedSymbolAt } from "../../support/resolvedSymbolAt.js"
import { emptyDeclarations } from "./emptyDeclarations.js"
import { nodeEquivalence } from "./nodeEquivalence.js"

export const symbolOwnsIdentifier = (identifier: ts.Identifier) => (symbol: ts.Symbol) => {
  const declarations = symbol.declarations ?? emptyDeclarations

  const isIdentifierParent = (declaration: ts.Node) =>
    nodeEquivalence(identifier.parent, declaration)

  return Array.some(declarations, isIdentifierParent)
}

export const symbolForIdentifier =
  (checker: ts.TypeChecker) =>
  (identifier: ts.Identifier): Option.Option<ts.Symbol> => {
    if (strictEqual("")(identifier.text)) {
      return Option.none()
    }

    const hasIdentifierName = Function.flow(
      (symbol: ts.Symbol) => symbol.getName(),
      strictEqual(identifier.text)
    )

    const localSymbol = pipe(
      checker.getSymbolsInScope(identifier, ts.SymbolFlags.All),
      Array.filter(hasIdentifierName),
      Array.findFirst(symbolOwnsIdentifier(identifier))
    )

    return pipe(
      localSymbol,
      Option.orElse(() => resolvedSymbolAt(checker)(identifier))
    )
  }
