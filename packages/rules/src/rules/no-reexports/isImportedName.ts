import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"

const namedBindingsDeclareName = (name: string) => (bindings: ts.NamedImportBindings) => {
  const isNameText = strictEqual(name)

  const namespaceMatches = pipe(
    bindings,
    Option.liftPredicate(ts.isNamespaceImport),
    Option.map(Function.flow(Struct.get("name"), Struct.get("text"))),
    Option.exists(isNameText)
  )

  const elementHasName = (element: ts.ImportSpecifier) => strictEqual(name)(element.name.text)

  const namedImportsDeclareName = (namedImports: ts.NamedImports) =>
    Array.some(namedImports.elements, elementHasName)

  const namedImportMatches = pipe(
    bindings,
    Option.liftPredicate(ts.isNamedImports),
    Option.exists(namedImportsDeclareName)
  )

  const importMatches = Array.make(namespaceMatches, namedImportMatches)

  return Array.some(importMatches, Boolean)
}

const importClause = Function.flow(
  Struct.get<ts.ImportDeclaration, "importClause">("importClause"),
  Option.fromNullishOr
)

const importDeclaresName = (name: string) => (statement: ts.Statement) => {
  const isNameText = strictEqual(name)
  const bindingsDeclareName = namedBindingsDeclareName(name)

  return pipe(
    statement,
    Option.liftPredicate(ts.isImportDeclaration),
    Option.flatMap(importClause),
    Option.exists((clause) => {
      const defaultImportMatches = pipe(
        clause.name,
        Option.fromNullishOr,
        Option.map(Struct.get("text")),
        Option.exists(isNameText)
      )

      const namedImportMatches = pipe(
        clause.namedBindings,
        Option.fromNullishOr,
        Option.exists(bindingsDeclareName)
      )

      return defaultImportMatches || namedImportMatches
    })
  )
}

export const isImportedName = (name: string) => (sourceFile: ts.SourceFile) => {
  const statementDeclaresName = importDeclaresName(name)

  return Array.some(sourceFile.statements, statementDeclaresName)
}
