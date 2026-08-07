import { Array, Function, Option, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type * as ts from "typescript"
import type { EntityDeclaration } from "./entityDeclaration.js"
import { emptyDeclarations } from "./emptyDeclarations.js"
import { nodeEquivalence } from "./nodeEquivalence.js"
import { symbolForIdentifier } from "./symbolOwnsIdentifier.js"

export const defaultDeclarationSymbol =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (declaration: EntityDeclaration): Option.Option<ts.Symbol> => {
    const isDefaultSymbol = Function.flow(
      (symbol: ts.Symbol) => symbol.getName(),
      strictEqual("default")
    )

    const ownsDeclaration = (symbol: ts.Symbol) => {
      const declarations = symbol.declarations ?? emptyDeclarations
      const isDeclaration = (candidate: ts.Node) => nodeEquivalence(declaration, candidate)

      return Array.some(declarations, isDeclaration)
    }

    return pipe(
      checker.getSymbolAtLocation(sourceFile),
      Option.fromNullishOr,
      Option.map((moduleSymbol) => checker.getExportsOfModule(moduleSymbol)),
      Option.map(Array.filter(isDefaultSymbol)),
      Option.flatMap(Array.findFirst(ownsDeclaration))
    )
  }

export const symbolsForOptionalDeclaration =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (declaration: ts.FunctionDeclaration | ts.ClassDeclaration): ReadonlyArray<ts.Symbol> =>
    pipe(
      declaration.name,
      Option.fromNullishOr,
      Option.flatMap(symbolForIdentifier(checker)),
      Option.orElse(() => defaultDeclarationSymbol(checker)(sourceFile)(declaration)),
      Option.toArray
    )
