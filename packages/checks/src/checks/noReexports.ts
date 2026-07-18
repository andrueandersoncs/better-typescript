import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeDetection } from "@better-typescript/core/engine/check"
import { makeFileCheck } from "../defineCheck.js"

const message = "Do not re-export imported bindings."

const hint =
  "Import the dependency where it is used and expose a locally defined public interface instead."

const namedBindingsDeclareName = (bindings: ts.NamedImportBindings, name: string) => {
  const namespaceMatches = pipe(
    bindings,
    Option.liftPredicate(ts.isNamespaceImport),
    Option.exists((namespace) => namespace.name.text === name)
  )

  const namedImportMatches = pipe(
    bindings,
    Option.liftPredicate(ts.isNamedImports),
    Option.exists((namedImports) =>
      Array.some(namedImports.elements, (element) => element.name.text === name)
    )
  )

  const importMatches = Array.make(namespaceMatches, namedImportMatches)

  return Array.some(importMatches, Boolean)
}

const importDeclaresName = (statement: ts.Statement, name: string) =>
  pipe(
    statement,
    Option.liftPredicate(ts.isImportDeclaration),
    Option.flatMap((declaration) => Option.fromNullishOr(declaration.importClause)),
    Option.exists((clause) => {
      const defaultImportMatches = pipe(
        clause.name,
        Option.fromNullishOr,
        Option.exists((identifier) => identifier.text === name)
      )

      const namedImportMatches = pipe(
        clause.namedBindings,
        Option.fromNullishOr,
        Option.exists((bindings) => namedBindingsDeclareName(bindings, name))
      )

      return defaultImportMatches || namedImportMatches
    })
  )

const isImportedName = (sourceFile: ts.SourceFile, name: string) =>
  Array.some(sourceFile.statements, (statement) => importDeclaresName(statement, name))

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
): ReadonlyArray<ts.ExportSpecifier> =>
  pipe(
    declaration.exportClause,
    Option.fromNullishOr,
    Option.filter(ts.isNamedExports),
    Option.map((clause) =>
      Array.filter(clause.elements, (specifier) => {
        const localName = localNameOf(specifier)

        return isImportedName(sourceFile, localName)
      })
    ),
    Option.getOrElse(() => Array.empty())
  )

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
  (sourceFile: ts.SourceFile) => (assignment: ts.ExportAssignment) =>
    pipe(
      assignment.expression,
      Option.liftPredicate(ts.isIdentifier),
      Option.exists((identifier) => isImportedName(sourceFile, identifier.text))
    )

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

  return Array.map(declarations, (node) => element({ node, message, hint }))
}

export const noReexports = makeFileCheck("no-reexports", reexportElements)
