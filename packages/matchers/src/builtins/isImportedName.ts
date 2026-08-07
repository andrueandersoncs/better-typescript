import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"

const namedBindingsDeclareName = (bindings: ts.NamedImportBindings, name: string) => {
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

const importDeclaresName = (statement: ts.Statement, name: string) => {
  const isNameText = strictEqual(name)

  const bindingsDeclareName = (bindings: ts.NamedImportBindings) =>
    namedBindingsDeclareName(bindings, name)

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

export const isImportedName = (sourceFile: ts.SourceFile, name: string) => {
  const statementDeclaresName = (statement: ts.Statement) => importDeclaresName(statement, name)

  return Array.some(sourceFile.statements, statementDeclaresName)
}
