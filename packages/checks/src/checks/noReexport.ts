import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import {
  combineAll,
  nodeSubscriptions
} from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { MakeDetection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const message = "Avoid re-exporting entities defined in other files."

const hint =
  "Define the entity in this file before exporting it, or import it directly " +
  "from the file that defines it. For package entrypoints, point package.json " +
  "exports at the defining modules instead of barrel re-exports."

const isImportDeclaration = (declaration: ts.Declaration): boolean => {
  const value86 = ts.isImportSpecifier(declaration)
  const value87 = ts.isNamespaceImport(declaration)
  const value88 = ts.isImportClause(declaration)
  const value89 = ts.isImportEqualsDeclaration(declaration)
  const conditions = Array.make(value86, value87, value88, value89)

  return Array.some(conditions, Boolean)
}

const isImportedSymbol = (symbol: ts.Symbol): boolean => {
  const aliased = (symbol.flags & ts.SymbolFlags.Alias) !== 0
  const declarations = symbol.declarations ?? Array.empty()
  const imported = Array.some(declarations, isImportDeclaration)

  return aliased && imported
}

const reexportDetection =
  (element: MakeDetection) =>
  (node: ts.Node): Detection =>
    element({
      node,
      message,
      hint
    })

const exportDeclarationElements = (context: CheckContext) => {
  const element = detection(context)
  const detect = reexportDetection(element)
  const { checker } = context

  const matches = (node: ts.ExportDeclaration): ReadonlyArray<Detection> => {
    const moduleSpecifier = Option.fromNullable(node.moduleSpecifier)

    if (Option.isSome(moduleSpecifier)) {
      const value90 = detect(node)
      return Array.of(value90)
    }

    return pipe(
      Option.fromNullable(node.exportClause),
      Option.filter(ts.isNamedExports),
      Option.map((exportClause) =>
        pipe(
          exportClause.elements,
          Array.filterMap((specifier) => {
            const localTarget =
              checker.getExportSpecifierLocalTargetSymbol(specifier)

            const imported = pipe(
              Option.fromNullable(localTarget),
              Option.exists(isImportedSymbol)
            )

            const detected = detect(specifier)

            return imported ? Option.some(detected) : Option.none()
          })
        )
      ),
      Option.getOrElse((): ReadonlyArray<Detection> => Array.empty())
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
      Option.filter((name) =>
        pipe(
          checker.getSymbolAtLocation(name),
          Option.fromNullable,
          Option.exists(isImportedSymbol)
        )
      ),
      Option.map(() => pipe(node, detect, Array.of)),
      Option.getOrElse((): ReadonlyArray<Detection> => Array.empty())
    )

  return matches
}

const values92 = Array.of(ts.SyntaxKind.ExportDeclaration)

const exportDeclarationListeners = nodeSubscriptions(values92)(
  ts.isExportDeclaration
)(exportDeclarationElements)

const values93 = Array.of(ts.SyntaxKind.ExportAssignment)

const exportAssignmentListeners = nodeSubscriptions(values93)(
  ts.isExportAssignment
)(exportAssignmentElements)

const values94 = Array.make(
  exportDeclarationListeners,
  exportAssignmentListeners
)

export const noReexport: Check = combineAll(values94)

export const noReexportExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-reexport")
