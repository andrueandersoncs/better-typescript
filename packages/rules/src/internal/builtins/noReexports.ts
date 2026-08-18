import { Array, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { fileScanner } from "../scanner/fileScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { isImportedName } from "./isImportedName.js"

// NoReexportsFact exists because its fields form one stable data contract used by the linter.
export const NoReexportsFact = Schema.Struct({})

export interface NoReexportsFact extends Schema.Schema.Type<typeof NoReexportsFact> {}

// emptyNoReexportsFact exists because its fields form one stable data contract used by the linter.
export const emptyNoReexportsFact = NoReexportsFact.make({})

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

const importedReexportNodes =
  (sourceFile: ts.SourceFile) =>
  (declaration: ts.ExportDeclaration): ReadonlyArray<ts.ExportSpecifier> => {
    const isImportedSpecifier = (specifier: ts.ExportSpecifier) => {
      const localName = localNameOf(specifier)

      return isImportedName(localName)(sourceFile)
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
        onNone: () => importedReexportNodes(sourceFile)(declaration),
        onSome: () => directReexportNodes(declaration)
      })
    )

const isImportedExportAssignment =
  (sourceFile: ts.SourceFile) => (assignment: ts.ExportAssignment) => {
    const identifierIsImported = (identifier: ts.Identifier) =>
      isImportedName(identifier.text)(sourceFile)

    return pipe(
      assignment.expression,
      Option.liftPredicate(ts.isIdentifier),
      Option.exists(identifierIsImported)
    )
  }

const makeReexportMatch = (node: ts.Node) => makeNodeMatch(node, emptyNoReexportsFact)

const matches = (context: MatchContext) => {
  const exportedAssignments = pipe(
    context.sourceFile.statements,
    Array.filter(ts.isExportAssignment),
    Array.filter(isImportedExportAssignment(context.sourceFile))
  )

  const declarations = pipe(
    context.sourceFile.statements,
    Array.filter(ts.isExportDeclaration),
    Array.flatMap(reexportDeclarationNodes(context.sourceFile)),
    Array.appendAll(exportedAssignments)
  )

  return Array.map(declarations, makeReexportMatch)
}

export const noReexportsScanner = fileScanner(matches)
