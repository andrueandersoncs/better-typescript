import { Option, pipe } from "effect"
import type * as ts from "typescript"
import { symbolForIdentifier } from "./symbolOwnsIdentifier.js"

export const symbolsForRequiredDeclaration =
  (checker: ts.TypeChecker) =>
  (
    declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration
  ): ReadonlyArray<ts.Symbol> =>
    pipe(declaration.name, symbolForIdentifier(checker), Option.toArray)
