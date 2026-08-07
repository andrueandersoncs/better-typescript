import { Array, Function, HashMap, Option, pipe, Predicate, Struct, Tuple, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { resolvedSymbolAt } from "../../support/resolvedSymbolAt.js"
import { referenceKey } from "../../support/referenceKey.js"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import { foldAst } from "../../sources/foldAst.js"
import { isProjectSourceFile } from "../../sources/isProjectSourceFile.js"
import type { ProgramContext } from "../../sources/data.js"
import { toRelativeFileName } from "../../support/paths.js"
import { isTestSourceFile } from "./isTestPath.js"
import { ExportUsage } from "./exportUsage.js"
import { makeEmptyUsage } from "./makeEmptyUsage.js"

const isImportBinding = (node: ts.Identifier) => {
  const isImportSpecifier = ts.isImportSpecifier(node.parent)
  const isImportClause = ts.isImportClause(node.parent)
  const isNamespaceImport = ts.isNamespaceImport(node.parent)
  const isImportEquals = ts.isImportEqualsDeclaration(node.parent)
  const checks = Array.make(isImportSpecifier, isImportClause, isNamespaceImport, isImportEquals)

  return Array.some(checks, Boolean)
}

const isDirectCallReference = (node: ts.Identifier) => {
  const expressionIsNode = flow(
    Struct.get<ts.CallExpression, "expression">("expression"),
    strictEqual(node)
  )

  const directCall = pipe(
    Option.liftPredicate(ts.isCallExpression)(node.parent),
    Option.exists(expressionIsNode)
  )

  const accessInvokesNode = (access: ts.PropertyAccessExpression) => {
    const hasReferencedName = strictEqual(node)(access.name)
    const callParent = Option.liftPredicate(ts.isCallExpression)(access.parent)

    const expressionIsAccess = flow(
      Struct.get<ts.CallExpression, "expression">("expression"),
      strictEqual(access)
    )

    const invokesAccess = pipe(callParent, Option.exists(expressionIsAccess))

    return hasReferencedName && invokesAccess
  }

  const propertyCall = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node.parent),
    Option.exists(accessInvokesNode)
  )

  return directCall || propertyCall
}

const appendUnique =
  (value: string) =>
  (values: ReadonlyArray<string>): ReadonlyArray<string> =>
    Array.contains(values, value) ? values : Array.append(values, value)

const makeUpdatedUsage =
  (isTest: boolean, isCall: boolean, path: string) => (usage: ExportUsage) => {
    const callIncrement = isCall ? 1 : 0

    if (isTest) {
      const testPaths = appendUnique(path)(usage.testPaths)

      return new ExportUsage({
        ...usage,
        testCallCount: usage.testCallCount + callIncrement,
        testPaths
      })
    }

    const productionPaths = appendUnique(path)(usage.productionPaths)
    const nonCallReference = !isCall
    const hasProductionNonCallReference = usage.hasProductionNonCallReference || nonCallReference

    return new ExportUsage({
      ...usage,
      productionCallCount: usage.productionCallCount + callIncrement,
      productionPaths,
      hasProductionNonCallReference
    })
  }

// UsageScanEntry is shared because both export index entry types need one scan contract.
type UsageScanEntry = {
  readonly symbol: ts.Symbol
}

export const buildUsageMap =
  (context: ProgramContext) =>
  <Entry extends UsageScanEntry>(
    entries: ReadonlyArray<Entry>,
    referenceFilter: (entry: Entry) => (node: ts.Identifier) => boolean
  ): HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage> => {
    const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))

    const entryPair = (entry: Entry) => {
      const key = referenceKey(entry.symbol)

      return Tuple.make(key, entry)
    }

    const entryPairs = Array.map(entries, entryPair)
    const entriesBySymbol = HashMap.fromIterable(entryPairs)
    const relative = toRelativeFileName(context.projectRoot)
    const classifyTestSource = isTestSourceFile(context.workspaceRoot)

    const scanFile =
      (sourceFile: ts.SourceFile) =>
      (
        usages: HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage>
      ): HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage> => {
        const sourcePath = relative(sourceFile.fileName)
        const fromTest = classifyTestSource(sourceFile)

        const foldNode = (
          current: HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage>,
          node: ts.Node
        ): HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage> => {
          const resolveIdentifierUsages = (currentIdentifier: ts.Identifier) => {
            const entryForSymbol = (symbol: ts.Symbol) => {
              const symbolKey = referenceKey(symbol)

              return HashMap.get(entriesBySymbol, symbolKey)
            }

            const matchesReferenceFilter = Function.flip(referenceFilter)(currentIdentifier)

            const updatedUsagesFor = (candidate: Entry) => {
              const candidateKey = referenceKey(candidate.symbol)

              const usage = pipe(
                HashMap.get(current, candidateKey),
                Option.getOrElse(makeEmptyUsage)
              )

              const isCall = isDirectCallReference(currentIdentifier)
              const updated = makeUpdatedUsage(fromTest, isCall, sourcePath)(usage)

              return HashMap.set(current, candidateKey, updated)
            }

            return pipe(
              resolvedSymbolAt(context.checker)(currentIdentifier),
              Option.flatMap(entryForSymbol),
              Option.filter(matchesReferenceFilter),
              Option.map(updatedUsagesFor)
            )
          }

          return pipe(
            Option.liftPredicate(ts.isIdentifier)(node),
            Option.filter(Predicate.not(isImportBinding)),
            Option.flatMap(resolveIdentifierUsages),
            Option.getOrElse(Function.constant(current))
          )
        }

        return foldAst(foldNode)(sourceFile)(usages)
      }

    const initialUsages = HashMap.empty<ReferenceKey<ts.Symbol>, ExportUsage>()

    const scanSourceFile = (
      current: HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage>,
      sourceFile: ts.SourceFile
    ) => scanFile(sourceFile)(current)

    return Array.reduce(projectFiles, initialUsages, scanSourceFile)
  }
