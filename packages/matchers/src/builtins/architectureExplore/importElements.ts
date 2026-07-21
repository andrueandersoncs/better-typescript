import { Option, Struct, pipe } from "effect"
import * as ts from "typescript"

export const importElements =
  <Context, Element>(
    elementFor: (
      context: Context
    ) => (node: ts.ImportDeclaration) => (specifier: string) => Option.Option<Element>
  ) =>
  (context: Context) => {
    const elementForImport = elementFor(context)

    const elementsForImport = (node: ts.ImportDeclaration): ReadonlyArray<Element> => {
      const elementForSpecifier = elementForImport(node)

      return pipe(
        Option.fromNullishOr(node.moduleSpecifier),
        Option.filter(ts.isStringLiteral),
        Option.map(Struct.get("text")),
        Option.flatMap(elementForSpecifier),
        Option.toArray
      )
    }

    return elementsForImport
  }
