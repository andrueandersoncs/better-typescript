import { Array, Function, HashMap, Option, Tuple, pipe } from "effect"
import * as ts from "typescript"
import {
  fileSubscriptions,
  withProgramIndex
} from "@better-typescript/core/engine/check"
import { functionInitializer, hasExportModifier } from "../support/tsNode.js"
import {
  foldAst,
  isProjectSourceFile
} from "@better-typescript/core/engine/sources"
import {
  detection,
  toRelativeFileName
} from "@better-typescript/core/engine/location"
import type { Check } from "@better-typescript/core/engine/check/data"
import type {
  CheckContext,
  Subscription
} from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { SingleUsePureExportData } from "./data.js"
import {
  type Classifications,
  FunctionEntry,
  PureExportIndex,
  SymbolClassification,
  emptyClassifications,
  fallbackEmptyClassification
} from "./singleUsePureExportData.js"

const isPureLookingBody = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
): boolean =>
  pipe(
    Option.fromNullable(node.body),
    Option.map((body) => {
      if (ts.isBlock(body)) {
        const hasImpure = foldAst((found: boolean, child: ts.Node): boolean => {
          const isNew = ts.isNewExpression(child)

          const isAssignment = pipe(
            Option.liftPredicate(ts.isBinaryExpression)(child),
            Option.exists(
              (binary) =>
                binary.operatorToken.kind === ts.SyntaxKind.EqualsToken
            )
          )

          const isImpure = isNew || isAssignment

          return found || isImpure
        })(body)(false)

        return !hasImpure
      }

      return !ts.isNewExpression(body)
    }),
    Option.getOrElse(Function.constant(false))
  )

const isSingleUseClassification = (
  classification: SymbolClassification
): boolean => {
  const isSingleCallee = classification.calleeCount === 1
  const isNotDisqualified = !classification.disqualified

  const conditions = Array.make(isSingleCallee, isNotDisqualified)

  return Array.every(conditions, Boolean)
}

const statementEntries = (
  statement: ts.Statement
): ReadonlyArray<FunctionEntry> => {
  const variableEntries = ts.isVariableStatement(statement)
    ? Array.filterMap(statement.declarationList.declarations, (declaration) =>
        pipe(
          functionInitializer(declaration),
          Option.flatMap((fn) =>
            pipe(
              Option.liftPredicate(ts.isIdentifier)(declaration.name),
              Option.map((nameNode) => {
                const isExported = hasExportModifier(statement)
                const isPureLooking = isPureLookingBody(fn)

                return new FunctionEntry({
                  nameNode,
                  declarationNode: declaration,
                  isExported,
                  isPureLooking
                })
              })
            )
          )
        )
      )
    : Array.empty()

  const functionEntries = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(statement),
    Option.flatMap((declaration) =>
      pipe(
        Option.fromNullable(declaration.name),
        Option.map((nameNode) => {
          const isExported = hasExportModifier(declaration)
          const isPureLooking = isPureLookingBody(declaration)

          return new FunctionEntry({
            nameNode,
            declarationNode: declaration,
            isExported,
            isPureLooking
          })
        })
      )
    ),
    Option.toArray
  )

  return Array.appendAll(variableEntries, functionEntries)
}

const sourceFileEntries = (
  sourceFile: ts.SourceFile
): ReadonlyArray<FunctionEntry> =>
  Array.flatMap(sourceFile.statements, statementEntries)

const symbolForEntry =
  (checker: ts.TypeChecker) =>
  (entry: FunctionEntry): Option.Option<ts.Symbol> =>
    pipe(checker.getSymbolAtLocation(entry.nameNode), Option.fromNullable)

const buildIndex = (context: ProgramContext): PureExportIndex => {
  const program = context.program
  const checker = context.checker
  const sourceFiles = program.getSourceFiles()
  const projectFiles = Array.filter(sourceFiles, isProjectSourceFile)
  const entries = Array.flatMap(projectFiles, sourceFileEntries)

  const symbolEntryPairs = Array.filterMap(entries, (entry) =>
    pipe(
      symbolForEntry(checker)(entry),
      Option.map((sym): [ts.Symbol, FunctionEntry] => Tuple.make(sym, entry))
    )
  )

  const symbolToEntry = HashMap.fromIterable(symbolEntryPairs)

  const folder = (
    classifications: Classifications,
    sourceFile: ts.SourceFile
  ): Classifications =>
    foldAst((folded: Classifications, node: ts.Node): Classifications => {
      if (!ts.isIdentifier(node)) {
        return folded
      }

      const sym = checker.getSymbolAtLocation(node)
      const symOption = Option.fromNullable(sym)

      const trackedSym = Option.filter(symOption, (candidate) =>
        HashMap.has(symbolToEntry, candidate)
      )

      const nonDeclSym = Option.filter(trackedSym, (candidate) =>
        pipe(
          HashMap.get(symbolToEntry, candidate),
          Option.map((entry) => entry.declarationNode.name ?? entry.nameNode),
          Option.exists((declName) => node !== declName)
        )
      )

      return pipe(
        nonDeclSym,
        Option.map((candidate) => {
          const current = pipe(
            HashMap.get(folded, candidate),
            Option.getOrElse(fallbackEmptyClassification)
          )

          if (
            pipe(
              Option.liftPredicate(ts.isCallExpression)(node.parent),
              Option.exists((call) => call.expression === node)
            )
          ) {
            const updated = new SymbolClassification({
              calleeCount: current.calleeCount + 1,
              disqualified: current.disqualified,
              callerFile: sourceFile.fileName
            })

            return HashMap.set(folded, candidate, updated)
          }

          const disqualified = new SymbolClassification({
            calleeCount: current.calleeCount,
            disqualified: true,
            callerFile: current.callerFile
          })

          return HashMap.set(folded, candidate, disqualified)
        }),
        Option.getOrElse(Function.constant(folded))
      )
    })(sourceFile)(classifications)

  const classifications = Array.reduce(
    projectFiles,
    emptyClassifications,
    folder
  )

  return new PureExportIndex({
    entries,
    classifications,
    projectRoot: context.projectRoot
  })
}

const listeners = (index: PureExportIndex): ReadonlyArray<Subscription> => {
  const matches = (context: CheckContext): ReadonlyArray<Detection> => {
    const match = detection(context)
    const relative = toRelativeFileName(index.projectRoot)
    const sourceFileName = context.sourceFile.fileName

    const isExportedPureInFile = (entry: FunctionEntry): boolean => {
      const isExported = entry.isExported
      const isPureLooking = entry.isPureLooking

      const entrySourceFile = entry.nameNode.getSourceFile()
      const isInFile = entrySourceFile.fileName === sourceFileName

      const conditions = Array.make(isExported, isPureLooking, isInFile)

      return Array.every(conditions, Boolean)
    }

    return pipe(
      index.entries,
      Array.filter(isExportedPureInFile),
      Array.filterMap((entry) =>
        pipe(
          symbolForEntry(context.checker)(entry),
          Option.flatMap((sym) => HashMap.get(index.classifications, sym)),
          Option.filter(isSingleUseClassification),
          Option.map((classification) => {
            const callerPath = relative(classification.callerFile)

            const data = new SingleUsePureExportData({
              calleeCount: classification.calleeCount,
              callerPath
            })

            return match({
              node: entry.nameNode,
              message:
                "Single-use Pure Export — a pure helper extracted for testability; locality lives at the caller.",
              hint: "Move the helper next to its only caller (or inline it) so bugs and changes concentrate in one Module.",
              data
            })
          })
        )
      )
    )
  }

  return fileSubscriptions(matches)
}

export const singleUsePureExport: Check =
  withProgramIndex(buildIndex)(listeners)

export const singleUsePureExportExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("single-use-pure-export")
