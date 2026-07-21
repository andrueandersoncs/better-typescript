import { Array, Function, Option, pipe, Struct, Schema } from "effect"
import * as ts from "typescript"
import { fileMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { strictEqual } from "../equivalence.js"

// NoReexportsFact is empty payload because guidance and matchers share identity.
export const NoReexportsFact = Schema.Struct({})

export interface NoReexportsFact extends Schema.Schema.Type<typeof NoReexportsFact> {}

// emptyNoReexportsFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoReexportsFact = NoReexportsFact.make({})

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

const reexportMatch = (node: ts.Node) => nodeMatch(node, emptyNoReexportsFact)

const matches = (context: MatchContext) => {
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

  return Array.map(declarations, reexportMatch)
}

export const noReexportsMatcher = fileMatcher(matches)
