import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { combineAll, nodeSubscriptions } from "../engine/check.js"
import type { Check, CheckContext } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Detection, MakeDetection } from "../engine/location.js"
import {
  fixtureRefactorExamples
} from "../engine/example.js"
import type { NonEmptyRefactorExamples } from "../engine/example.js"

const message = "Avoid re-exporting entities defined in other files."

const hint =
  "Define the entity in this file before exporting it, or import it directly " +
  "from the file that defines it. For package entrypoints, point package.json " +
  "exports at the defining modules instead of barrel re-exports."

const isImportDeclaration = (declaration: ts.Declaration): boolean =>
  [
    ts.isImportSpecifier(declaration),
    ts.isNamespaceImport(declaration),
    ts.isImportClause(declaration),
    ts.isImportEqualsDeclaration(declaration)
  ].some(Boolean)

const isImportedSymbol = (symbol: ts.Symbol): boolean => {
  const aliased = (symbol.flags & ts.SymbolFlags.Alias) !== 0
  const imported = (symbol.declarations ?? []).some(isImportDeclaration)

  return aliased && imported
}

const isImportedIdentifier =
  (checker: ts.TypeChecker) =>
  (name: ts.Identifier): boolean => {
    const symbolAtLocation = checker.getSymbolAtLocation(name)

    return pipe(
      Option.fromNullable(symbolAtLocation),
      Option.exists(isImportedSymbol)
    )
  }

const isImportedExportSpecifier =
  (checker: ts.TypeChecker) =>
  (specifier: ts.ExportSpecifier): boolean => {
    const localTarget = checker.getExportSpecifierLocalTargetSymbol(specifier)

    return pipe(
      Option.fromNullable(localTarget),
      Option.exists(isImportedSymbol)
    )
  }

const reexportDetection =
  (element: MakeDetection) =>
  (node: ts.Node): Detection =>
    element({
      node,
      message,
      hint
    })

const namedExportReexports =
  (checker: ts.TypeChecker) =>
  (element: MakeDetection) =>
  (exportClause: ts.NamedExports): ReadonlyArray<Detection> => {
    const detect = reexportDetection(element)

    return pipe(
      exportClause.elements,
      Array.filterMap((specifier) => {
        const imported = isImportedExportSpecifier(checker)(specifier)
        const detected = detect(specifier)

        return imported ? Option.some(detected) : Option.none()
      })
    )
  }

const exportDeclarationElements = (context: CheckContext) => {
  const element = detection(context)
  const detect = reexportDetection(element)
  const { checker } = context

  const matches = (node: ts.ExportDeclaration): ReadonlyArray<Detection> => {
    const moduleSpecifier = Option.fromNullable(node.moduleSpecifier)

    if (Option.isSome(moduleSpecifier)) {
      return [detect(node)]
    }

    return pipe(
      Option.fromNullable(node.exportClause),
      Option.filter(ts.isNamedExports),
      Option.map(namedExportReexports(checker)(element)),
      Option.getOrElse((): ReadonlyArray<Detection> => [])
    )
  }

  return matches
}

const exportAssignmentElements = (context: CheckContext) => {
  const element = detection(context)
  const detect = reexportDetection(element)
  const { checker } = context

  const matches = (node: ts.ExportAssignment): ReadonlyArray<Detection> =>
    pipe(
      Option.liftPredicate(ts.isIdentifier)(node.expression),
      Option.filter(isImportedIdentifier(checker)),
      Option.map(() => [detect(node)]),
      Option.getOrElse((): ReadonlyArray<Detection> => [])
    )

  return matches
}

const exportDeclarationListeners = nodeSubscriptions([
  ts.SyntaxKind.ExportDeclaration
])(ts.isExportDeclaration)(exportDeclarationElements)

const exportAssignmentListeners = nodeSubscriptions([
  ts.SyntaxKind.ExportAssignment
])(ts.isExportAssignment)(exportAssignmentElements)

export const noReexport: Check = combineAll([
  exportDeclarationListeners,
  exportAssignmentListeners
])

export const noReexportExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-reexport")
