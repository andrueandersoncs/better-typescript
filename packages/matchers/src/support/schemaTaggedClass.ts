import * as ts from "typescript"
import { resolvedSymbolAt } from "./resolvedSymbolAt.js"
import { taggedClassHeritage } from "./taggedClassHeritage.js"
import { Array, Option, pipe } from "effect"

export const effectSchemaModuleSuffixes = Array.make(
  "/effect/dist/Schema.d.ts",
  "/effect/src/Schema.ts"
)

export const schemaTaggedClassHeritage = taggedClassHeritage(effectSchemaModuleSuffixes)

export const schemaTaggedClassEncodedType =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const typeOfSymbolAtDeclaration = (symbol: ts.Symbol) =>
      checker.getTypeOfSymbolAtLocation(symbol, declaration)

    const encodedProperty = (staticType: ts.Type) =>
      pipe(staticType.getProperty("Encoded"), Option.fromNullishOr)

    const typeOfEncodedAtDeclaration = (encoded: ts.Symbol) =>
      checker.getTypeOfSymbolAtLocation(encoded, declaration)

    const encodedTypeFromName = () =>
      pipe(
        declaration.name,
        Option.fromNullishOr,
        Option.flatMap(resolvedSymbolAt(checker)),
        Option.map(typeOfSymbolAtDeclaration),
        Option.flatMap(encodedProperty),
        Option.map(typeOfEncodedAtDeclaration)
      )

    return pipe(
      schemaTaggedClassHeritage(checker)(declaration),
      Option.flatMap(encodedTypeFromName)
    )
  }
