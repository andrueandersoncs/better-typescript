import {
  Array,
  Function,
  Option,
  Result,
  Schema,
  Struct,
  pipe,
  flow,
  Match as EffectMatch
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { toRelativeFileName } from "../support/paths.js"
import { functionInitializer } from "../support/functionInitializer2.js"
import { hasExportModifier } from "../support/hasExportModifier.js"
import { isProjectSourceFile } from "../sources/isProjectSourceFile.js"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { isPackageProject } from "./architectureExplore/isPackageProject.js"
import { isTestSourceFile } from "./architectureExplore/isTestPath.js"
import { toWorkspacePath } from "./architectureExplore/toWorkspacePath.js"
import { ExportedSymbolEntry } from "./architectureExplore/exportedSymbolEntry.js"
import type { ExportedSymbolKind } from "./architectureExplore/exportedSymbolKind.js"
import { ExportSymbolIndex } from "./architectureExplore/exportSymbolIndex.js"
import { ExportedSymbolUsage } from "./architectureExplore/exportedSymbolUsage.js"
import { namedExportEntry } from "./architectureExplore/namedExportEntry.js"
import { noExportedSymbolEntries } from "./architectureExplore/noExportedSymbolEntries.js"
import { buildUsageMap } from "./architectureExplore/programSymbols.js"
import { usageForSymbol } from "./architectureExplore/usageForSymbol.js"
import { FileTarget } from "../matcher/fileTarget.js"
import { Match } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { programIndexedFileMatcher } from "./programIndexedFileMatcher.js"

export const makeFileMatch = <Fact>(sourceFile: ts.SourceFile, fact: Fact) => {
  const target = new FileTarget({ sourceFile })
  const match = new Match({ target, fact })
  return match
}

const exportedSymbolUsageArray = Schema.Array(ExportedSymbolUsage)

// ExportSurfaceData is one file export inventory because workspace advice joins import usage.
export const ExportSurfaceData = Schema.Struct({
  workspacePath: Schema.String,
  symbols: exportedSymbolUsageArray
})

export interface ExportSurfaceData extends Schema.Schema.Type<typeof ExportSurfaceData> {}

const variableSymbolEntries =
  (checker: ts.TypeChecker) =>
  (statement: ts.VariableStatement): ReadonlyArray<ExportedSymbolEntry> => {
    if (!hasExportModifier(statement)) {
      return Array.empty()
    }

    const entryForDeclaration = (declaration: ts.VariableDeclaration) => {
      const entryForName = (nameNode: ts.Identifier) => {
        const initializer = functionInitializer(declaration)
        const kind: ExportedSymbolKind = Option.isSome(initializer) ? "function" : "value"

        return namedExportEntry(checker)(nameNode, kind)
      }

      return pipe(
        Option.liftPredicate(ts.isIdentifier)(declaration.name),
        Option.flatMap(entryForName),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(statement.declarationList.declarations, entryForDeclaration)
  }

const symbolEntriesForDeclaration =
  (checker: ts.TypeChecker) =>
  (kind: ExportedSymbolKind) =>
  (declaration: ts.DeclarationStatement): ReadonlyArray<ExportedSymbolEntry> => {
    if (!hasExportModifier(declaration)) {
      return noExportedSymbolEntries
    }

    const entryForName = (nameNode: ts.Identifier) => namedExportEntry(checker)(nameNode, kind)

    return pipe(
      Option.fromNullishOr(declaration.name),
      Option.filter(ts.isIdentifier),
      Option.flatMap(entryForName),
      Option.toArray
    )
  }

const exportedSymbolEntriesFor = (
  checker: ts.TypeChecker
): ((statement: ts.Statement) => ReadonlyArray<ExportedSymbolEntry>) => {
  const variableEntries = variableSymbolEntries(checker)
  const declarationEntries = symbolEntriesForDeclaration(checker)
  const functionEntries = declarationEntries("function")
  const classEntries = declarationEntries("class")
  const interfaceEntries = declarationEntries("type")
  const typeAliasEntries = declarationEntries("type")
  const enumEntries = declarationEntries("value")

  return pipe(
    EffectMatch.type<ts.Statement>(),
    EffectMatch.when(ts.isVariableStatement, variableEntries),
    EffectMatch.when(ts.isFunctionDeclaration, functionEntries),
    EffectMatch.when(ts.isClassDeclaration, classEntries),
    EffectMatch.when(ts.isInterfaceDeclaration, interfaceEntries),
    EffectMatch.when(ts.isTypeAliasDeclaration, typeAliasEntries),
    EffectMatch.when(ts.isEnumDeclaration, enumEntries),
    EffectMatch.orElse(Function.constant(noExportedSymbolEntries))
  )
}

const exportedSymbolsIn =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<ExportedSymbolEntry> =>
    Array.flatMap(sourceFile.statements, exportedSymbolEntriesFor(checker))

const isOutsideDeclaringFile = (entry: ExportedSymbolEntry) => (node: ts.Identifier) =>
  node.getSourceFile() !== entry.nameNode.getSourceFile()

export const buildExportSymbolIndex = (context: ProgramContext) => {
  const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))
  const entries = Array.flatMap(projectFiles, exportedSymbolsIn(context.checker))
  const usages = buildUsageMap(context)(entries, isOutsideDeclaringFile)
  return new ExportSymbolIndex({ entries, usages })
}

const exportSurfaceElements =
  (index: ExportSymbolIndex) =>
  (context: MatchContext): ReadonlyArray<Match<ExportSurfaceData>> => {
    const isTestFile = isTestSourceFile(context.workspaceRoot)(context.sourceFile)
    const isPackage = isPackageProject(context.workspaceRoot)(context.projectRoot)
    const shouldSkip = isTestFile || isPackage
    if (shouldSkip) {
      return Array.empty()
    }

    const usageOf = flow(
      Struct.get<ExportedSymbolEntry, "symbol">("symbol"),
      usageForSymbol(index.usages)
    )

    const isEntryInSourceFile = flow(
      Struct.get<(typeof index.entries)[number], "nameNode">("nameNode"),
      (nameNode: ts.Node) => nameNode.getSourceFile(),
      strictEqual(context.sourceFile)
    )

    const symbols = pipe(
      index.entries,
      Array.filter(isEntryInSourceFile),
      Array.map((entry) => {
        const usage = usageOf(entry)
        const referencingFileCount = usage.productionPaths.length + usage.testPaths.length
        const callCount = usage.productionCallCount + usage.testCallCount
        return ExportedSymbolUsage.make({
          name: entry.nameNode.text,
          kind: entry.kind,
          referencingFileCount,
          referencingTestFileCount: usage.testPaths.length,
          callCount
        })
      })
    )

    if (strictEqual(0)(symbols.length)) {
      return Array.empty()
    }

    const projectPath = toRelativeFileName(context.projectRoot)(context.sourceFile.fileName)
    const workspacePath = toWorkspacePath(context.projectRoot, context.workspaceRoot)(projectPath)
    const fact = ExportSurfaceData.make({ workspacePath, symbols })
    const reported = makeFileMatch(context.sourceFile, fact)
    return Array.of(reported)
  }

export const exportSurface =
  programIndexedFileMatcher(buildExportSymbolIndex)(exportSurfaceElements)
