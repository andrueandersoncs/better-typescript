import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { emptyIdentifiers } from "./emptyIdentifiers.js"

export const importBindingIdentifiers = (
  declaration: ts.ImportDeclaration
): ReadonlyArray<ts.Identifier> =>
  pipe(
    Option.fromNullishOr(declaration.importClause),
    Option.match({
      onNone: Function.constant(emptyIdentifiers),
      onSome: (importClause) => {
        const defaultBinding = pipe(Option.fromNullishOr(importClause.name), Option.toArray)

        return pipe(
          Option.fromNullishOr(importClause.namedBindings),
          Option.match({
            onNone: Function.constant(defaultBinding),
            onSome: (namedBindings) => {
              const named = ts.isNamespaceImport(namedBindings)
                ? Array.of(namedBindings.name)
                : Array.map(namedBindings.elements, Struct.get("name"))

              return Array.appendAll(defaultBinding, named)
            }
          })
        )
      }
    })
  )
