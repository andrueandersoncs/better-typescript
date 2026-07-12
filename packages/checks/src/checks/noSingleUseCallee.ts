import { Array, Function, HashMap, HashSet, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import {
  fileSubscriptions,
  withProgramIndex
} from "@better-typescript/core/engine/check"
import {
  functionInitializer,
  hasExportModifier
} from "./support/tsNode.js"
import {
  foldAst,
  isProjectSourceFile
} from "@better-typescript/core/engine/sources"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext, Subscription } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { ProgramContext } from "@better-typescript/core/engine/sources"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

class FunctionEntry extends Schema.Class<FunctionEntry>("FunctionEntry")({
  nameNode: Schema.Any,
  declarationNode: Schema.Any,
  isExported: Schema.Boolean
}) {
  declare readonly nameNode: ts.Identifier
  declare readonly declarationNode:
    | ts.FunctionDeclaration
    | ts.VariableDeclaration
}

const statementEntries = (
  statement: ts.Statement
): ReadonlyArray<FunctionEntry> => {
  const variableEntries = ts.isVariableStatement(statement)
    ? Array.filterMap(
        statement.declarationList.declarations,
        (declaration) =>
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
  sourceFile.statements.flatMap(statementEntries)

class SymbolClassification extends Schema.Class<SymbolClassification>(
  "SymbolClassification"
)({
  calleeCount: Schema.Number,
  disqualified: Schema.Boolean
}) {}

type Classifications = HashMap.HashMap<ts.Symbol, SymbolClassification>
const emptyClassification = new SymbolClassification({
  calleeCount: 0,
  disqualified: false
})

const emptyClassifications: Classifications = HashMap.empty()

const fallbackEmptyClassification: () => SymbolClassification =
  Function.constant(emptyClassification)

const disqualifiedClassification = new SymbolClassification({
  calleeCount: 0,
  disqualified: true
})

const isSingleCalleeEntry = (classification: SymbolClassification): boolean => {
  const isSingleCallee = classification.calleeCount === 1
  const isNotDisqualified = !classification.disqualified

  return isSingleCallee && isNotDisqualified
}

const symbolForEntry =
  (checker: ts.TypeChecker) =>
  (entry: FunctionEntry): Option.Option<ts.Symbol> => {
    const symbol = checker.getSymbolAtLocation(entry.nameNode)

    return Option.fromNullable(symbol)
  }

class ReferenceIndex extends Schema.Class<ReferenceIndex>("ReferenceIndex")({
  entries: Schema.Any,
  calleeOnlySymbols: Schema.Any
}) {
  declare readonly entries: ReadonlyArray<FunctionEntry>
  declare readonly calleeOnlySymbols: HashSet.HashSet<ts.Symbol>
}

const buildReferenceIndex = (context: ProgramContext): ReferenceIndex => {
  const program = context.program
  const checker = context.checker
  const projectFiles = program.getSourceFiles().filter(isProjectSourceFile)
  const entries = projectFiles.flatMap(sourceFileEntries)
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
          Option.map(
            (entry) => entry.declarationNode.name ?? entry.nameNode
          ),
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
