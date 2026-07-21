import { Array, Function, Option, pipe, Struct } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeDetection } from "@better-typescript/core/engine/check"
import { makeFileCheck } from "../defineCheck.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const message = "Do not re-export imported bindings."

const hint =
  "Import the dependency where it is used and expose a locally defined public interface instead."

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

const isImportedName = (sourceFile: ts.SourceFile, name: string) => {
  const statementDeclaresName = (statement: ts.Statement) => importDeclaresName(statement, name)

  return Array.some(sourceFile.statements, statementDeclaresName)
}

const localNameOf = (specifier: ts.ExportSpecifier) =>
  (specifier.propertyName ?? specifier.name).text

const directReexportNodes = (declaration: ts.ExportDeclaration): ReadonlyArray<ts.Node> =>
  pipe(
    declaration.exportClause,
    Option.fromNullishOr,
    Option.match({
      onNone: () => Array.of(declaration),
      onSome: (clause) => (ts.isNamedExports(clause) ? clause.elements : Array.of(clause))
    })
  )

const importedReexportNodes = (
  sourceFile: ts.SourceFile,
  declaration: ts.ExportDeclaration
): ReadonlyArray<ts.ExportSpecifier> => {
  const isImportedSpecifier = (specifier: ts.ExportSpecifier) => {
    const localName = localNameOf(specifier)

    return isImportedName(sourceFile, localName)
  }

  const importedElements = (clause: ts.NamedExports) =>
    Array.filter(clause.elements, isImportedSpecifier)

  return pipe(
    declaration.exportClause,
    Option.fromNullishOr,
    Option.filter(ts.isNamedExports),
    Option.map(importedElements),
    Option.getOrElse(Array.empty)
  )
}

const reexportDeclarationNodes =
  (sourceFile: ts.SourceFile) =>
  (declaration: ts.ExportDeclaration): ReadonlyArray<ts.Node> =>
    pipe(
      declaration.moduleSpecifier,
      Option.fromNullishOr,
      Option.match({
        onNone: () => importedReexportNodes(sourceFile, declaration),
        onSome: () => directReexportNodes(declaration)
      })
    )

const isImportedExportAssignment =
  (sourceFile: ts.SourceFile) => (assignment: ts.ExportAssignment) => {
    const identifierIsImported = (identifier: ts.Identifier) =>
      isImportedName(sourceFile, identifier.text)

    return pipe(
      assignment.expression,
      Option.liftPredicate(ts.isIdentifier),
      Option.exists(identifierIsImported)
    )
  }

const reexportElements = (context: CheckContext): ReadonlyArray<Detection> => {
  const element = makeDetection(context)
  const sourceFile = context.sourceFile

  const exportedAssignments = pipe(
    sourceFile.statements,
    Array.filter(ts.isExportAssignment),
    Array.filter(isImportedExportAssignment(sourceFile))
  )

  const declarations = pipe(
    sourceFile.statements,
    Array.filter(ts.isExportDeclaration),
    Array.flatMap(reexportDeclarationNodes(sourceFile)),
    Array.appendAll(exportedAssignments)
  )

  const detectionFor = (node: ts.Node) => element({ node, message, hint })

  return Array.map(declarations, detectionFor)
}

export const noReexports = makeFileCheck("no-reexports", reexportElements)
