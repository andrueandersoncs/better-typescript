import { Array, Option, Tuple, flow, pipe } from "effect"
import * as ts from "typescript"
import { isProjectFile } from "../../support/isProjectFile.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"
import { expressionPath } from "./expressionPath.js"

const symbolIsAmbient = (checker: ts.TypeChecker, identifier: ts.Identifier) =>
  pipe(
    checker.getSymbolAtLocation(identifier),
    Option.fromNullishOr,
    Option.map(declarationsOfSymbol),
    Option.exists((declarations) => {
      const hasDeclaration = declarations.length > 0

      const hasProjectDeclaration = Array.some(
        declarations,
        flow((declaration) => declaration.getSourceFile(), isProjectFile)
      )

      const notProjectDeclaration = !hasProjectDeclaration
      const ambientFlags = Array.make(hasDeclaration, notProjectDeclaration)

      return Array.every(ambientFlags, Boolean)
    })
  )

export const ambientPathAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression
): Option.Option<ReadonlyArray<string>> => {
  const pathRootIsAmbient = (path: readonly [ts.Identifier, ReadonlyArray<string>]) => {
    const root = Tuple.get(path, 0)

    return symbolIsAmbient(checker, root)
  }

  const ambientPathSegments = (path: readonly [ts.Identifier, ReadonlyArray<string>]) => {
    const root = Tuple.get(path, 0)
    const members = Tuple.get(path, 1)

    return Array.prepend(members, root.text)
  }

  return pipe(
    expressionPath(expression),
    Option.filter(pathRootIsAmbient),
    Option.map(ambientPathSegments)
  )
}
