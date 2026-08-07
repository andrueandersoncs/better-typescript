import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { emptyIdentifiers } from "./emptyIdentifiers.js"

export const exportBindingIdentifiers = (
  declaration: ts.ExportDeclaration
): ReadonlyArray<ts.Identifier> =>
  pipe(
    Option.fromNullishOr(declaration.exportClause),
    Option.match({
      onNone: Function.constant(emptyIdentifiers),
      onSome: (exportClause) => {
        const names = ts.isNamespaceExport(exportClause)
          ? Array.of(exportClause.name)
          : Array.map(exportClause.elements, Struct.get("name"))

        return Array.filter(names, ts.isIdentifier)
      }
    })
  )
