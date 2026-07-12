import { Array, HashMap, HashSet, Option, pipe } from "effect"
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
import { detection } from "@better-typescript/core/engine/location"
import type { Check } from "@better-typescript/core/engine/check"
import type {
  CheckContext,
  Subscription
} from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import {
  type Classifications,
  FunctionEntry,
  ReferenceIndex,
  SymbolClassification,
  disqualifiedClassification,
  emptyClassifications,
  fallbackEmptyClassification
} from "./data.js"

const isSingleCalleeEntry = (classification: SymbolClassification): boolean => {
  const isSingleCallee = classification.calleeCount === 1
  const isNotDisqualified = !classification.disqualified

  return Array.every([isSingleCallee, isNotDisqualified], Boolean)
}

const statementEntries = (
  statement: ts.Statement
): ReadonlyArray<FunctionEntry> => {
  const variableEntries = ts.isVariableStatement(statement)
    ? Array.filterMap(statement.declarationList.declarations, (declaration) =>
        pipe(
          functionInitializer(declaration),
          Option.flatMap(() =>
            Option.liftPredicate(ts.isIdentifier)(declaration.name)
          ),
          Option.map((nameNode) => {
            const isExported = hasExportModifier(statement)

            return new FunctionEntry({
              nameNode,
              declarationNode: declaration,
              isExported
            })
          })
        )
      )
    : []

  const functionEntries = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(statement),
    Option.flatMap((declaration) =>
      pipe(
        Option.fromNullable(declaration.name),
        Option.map((nameNode) => {
          const isExported = hasExportModifier(declaration)

          return new FunctionEntry({
            nameNode,
            declarationNode: declaration,
            isExported
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

const buildReferenceIndex = (context: ProgramContext): ReferenceIndex => {
  const program = context.program
  const checker = context.checker
  const sourceFiles = program.getSourceFiles()
  const projectFiles = Array.filter(sourceFiles, isProjectSourceFile)
  const entries = Array.flatMap(projectFiles, sourceFileEntries)

  const symbolEntryPairs = Array.filterMap(entries, (entry) =>
    pipe(
      symbolForEntry(checker)(entry),
      Option.map((sym): [ts.Symbol, FunctionEntry] => [sym, entry])
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
          if (
            pipe(
              Option.liftPredicate(ts.isCallExpression)(node.parent),
              Option.exists((call) => call.expression === node)
            )
          ) {
            const current = pipe(
              HashMap.get(folded, candidate),
              Option.getOrElse(fallbackEmptyClassification)
            )

            const updated = new SymbolClassification({
              calleeCount: current.calleeCount + 1,
              disqualified: current.disqualified
            })

            return HashMap.set(folded, candidate, updated)
          }

          return HashMap.set(folded, candidate, disqualifiedClassification)
        }),
        Option.getOrElse(() => folded)
      )
    })(sourceFile)(classifications)

  const classifications = Array.reduce(
    projectFiles,
    emptyClassifications,
    folder
  )

  const calleeOnlySymbols = pipe(
    HashMap.filter(classifications, isSingleCalleeEntry),
    HashMap.keys,
    HashSet.fromIterable
  )

  return new ReferenceIndex({ entries, calleeOnlySymbols })
}

const singleUseCalleeListeners = (
  index: ReferenceIndex
): ReadonlyArray<Subscription> => {
  const matches = (context: CheckContext): ReadonlyArray<Detection> => {
    const match = detection(context)

    return pipe(
      index.entries,
      Array.filter(
        (entry) =>
          entry.nameNode.getSourceFile().fileName ===
          context.sourceFile.fileName
      ),
      Array.filter((entry) =>
        pipe(
          symbolForEntry(context.checker)(entry),
          Option.filter((sym) => HashSet.has(index.calleeOnlySymbols, sym)),
          Option.filter(() => !entry.isExported),
          Option.isSome
        )
      ),
      Array.map((entry) =>
        match({
          node: entry.nameNode,
          message: "Avoid naming a function that is only called in one place.",
          hint:
            "This function has a single call site and is not passed by reference anywhere. " +
            "Inline its body at the call site to reduce indirection. If the function exists " +
            "for documentation, a comment at the call site conveys the same intent without " +
            "the abstraction cost."
        })
      )
    )
  }

  return fileSubscriptions(matches)
}

const check = withProgramIndex(buildReferenceIndex)(singleUseCalleeListeners)

export const noSingleUseCallee: Check = check

export const noSingleUseCalleeExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-single-use-callee")
