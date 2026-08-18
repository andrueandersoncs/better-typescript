import { Array, Function, MutableRef, Option, Result, Struct, Tuple, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { ProgramContext } from "../../sources/data.js"
import { isProjectSourceFile } from "../../sources/isProjectSourceFile.js"
import { toRelativeFileName } from "../../support/paths.js"
import { symbolDeclarations } from "../../support/symbolDeclarations.js"
import { ModuleEdge } from "./moduleEdge.js"
import { ArchitectureEvidence } from "./architectureEvidenceType.js"
import { CachedArchitectureEvidence } from "./cachedArchitectureEvidence.js"
import { ExportReferenceIndex } from "./exportReferenceIndex.js"
import { isTestSourceFile } from "./isTestPath.js"
import { ExportedFunctionEntry } from "./exportedFunctionEntry.js"
import { ExportedSymbolEntry } from "./exportedSymbolEntry.js"
import type { ExportedSymbolKind } from "./exportedSymbolKind.js"
import { ExportSymbolIndex } from "./exportSymbolIndex.js"
import { functionInitializer } from "../../support/functionInitializer2.js"
import { hasExportModifier } from "../../support/hasExportModifier.js"
import { resolvedSymbolAt } from "../../support/resolvedSymbolAt.js"
import { buildDualUsageMaps } from "./programSymbols.js"

const moduleSourceFile =
  (context: ProgramContext, containingFile: ts.SourceFile) => (moduleSpecifier: ts.Expression) => {
    const declarationsOf = Function.flow(
      symbolDeclarations,
      Option.fromNullishOr,
      Option.getOrElse((): ReadonlyArray<ts.Declaration> => Array.empty())
    )

    const checkerSource = pipe(
      context.checker.getSymbolAtLocation(moduleSpecifier),
      Option.fromNullishOr,
      Option.map(declarationsOf),
      Option.flatMap(Array.findFirst(ts.isSourceFile))
    )

    if (Option.isSome(checkerSource)) {
      return checkerSource
    }

    const specifier = pipe(
      Option.liftPredicate(ts.isStringLiteralLike)(moduleSpecifier),
      Option.map(Struct.get("text"))
    )

    const compilerOptions = context.program.getCompilerOptions()

    const resolveModule = (text: string) => {
      const resolution = ts.resolveModuleName(
        text,
        containingFile.fileName,
        compilerOptions,
        ts.sys
      )

      return Option.fromNullishOr(resolution.resolvedModule)
    }

    const sourceFileForResolved = (resolved: ts.ResolvedModule) =>
      pipe(context.program.getSourceFile(resolved.resolvedFileName), Option.fromNullishOr)

    return pipe(specifier, Option.flatMap(resolveModule), Option.flatMap(sourceFileForResolved))
  }

const statementModuleSpecifier = (statement: ts.Statement) => {
  if (ts.isImportDeclaration(statement)) {
    return Option.some(statement.moduleSpecifier)
  }

  const moduleSpecifierOf = (declaration: ts.ExportDeclaration) =>
    pipe(declaration.moduleSpecifier, Option.fromNullishOr)

  return pipe(
    Option.liftPredicate(ts.isExportDeclaration)(statement),
    Option.flatMap(moduleSpecifierOf)
  )
}

const buildModuleEdges = (context: ProgramContext): ReadonlyArray<ModuleEdge> => {
  const relative = toRelativeFileName(context.projectRoot)
  const classifyTestSource = isTestSourceFile(context.workspaceRoot)
  const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))

  const edgesForSourceFile = (sourceFile: ts.SourceFile) => {
    const importerPath = relative(sourceFile.fileName)
    const fromTest = classifyTestSource(sourceFile)

    const edgeForStatement = (statement: ts.Statement) => {
      const makeModuleEdgeForImportedFile = (importedFile: ts.SourceFile) => {
        const importedPath = relative(importedFile.fileName)

        return new ModuleEdge({
          importerPath,
          importedPath,
          fromTest
        })
      }

      return pipe(
        statementModuleSpecifier(statement),
        Option.flatMap(moduleSourceFile(context, sourceFile)),
        Option.filter(isProjectSourceFile),
        Option.map(makeModuleEdgeForImportedFile),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(sourceFile.statements, edgeForStatement)
  }

  return Array.flatMap(projectFiles, edgesForSourceFile)
}

type ExportEntries = readonly [
  ReadonlyArray<ExportedFunctionEntry>,
  ReadonlyArray<ExportedSymbolEntry>
]

const emptyExportEntries = (): ExportEntries => Tuple.make(Array.empty(), Array.empty())

const variableExportEntries =
  (checker: ts.TypeChecker) =>
  (statement: ts.VariableStatement): ExportEntries => {
    if (!hasExportModifier(statement)) {
      return emptyExportEntries()
    }

    const entriesForDeclaration = (declaration: ts.VariableDeclaration): ExportEntries => {
      const functionNode = functionInitializer(declaration)
      const kind: ExportedSymbolKind = Option.isSome(functionNode) ? "function" : "value"

      const entriesForName = (nameNode: ts.Identifier) => {
        const entriesForSymbol = (symbol: ts.Symbol): ExportEntries => {
          const symbolEntry = new ExportedSymbolEntry({ symbol, nameNode, kind })
          const functionEntries = pipe(
            functionNode,
            Option.map(
              (node) =>
                new ExportedFunctionEntry({
                  symbol,
                  nameNode,
                  declarationNode: declaration,
                  functionNode: node
                })
            ),
            Option.toArray
          )

          return Tuple.make(functionEntries, Array.of(symbolEntry))
        }

        return pipe(
          resolvedSymbolAt(checker)(nameNode),
          Option.map(entriesForSymbol),
          Option.getOrElse(emptyExportEntries)
        )
      }

      return pipe(
        Option.liftPredicate(ts.isIdentifier)(declaration.name),
        Option.map(entriesForName),
        Option.getOrElse(emptyExportEntries)
      )
    }

    const declarationEntries = Array.map(
      statement.declarationList.declarations,
      entriesForDeclaration
    )

    return Tuple.make(
      Array.flatMap(declarationEntries, Tuple.get(0)),
      Array.flatMap(declarationEntries, Tuple.get(1))
    )
  }

const functionExportEntries =
  (checker: ts.TypeChecker) =>
  (declaration: ts.FunctionDeclaration): ExportEntries => {
    if (!hasExportModifier(declaration)) {
      return emptyExportEntries()
    }

    const entriesForName = (nameNode: ts.Identifier) => {
      const entriesForSymbol = (symbol: ts.Symbol): ExportEntries => {
        const functionEntry = new ExportedFunctionEntry({
          symbol,
          nameNode,
          declarationNode: declaration,
          functionNode: declaration
        })

        const symbolEntry = new ExportedSymbolEntry({ symbol, nameNode, kind: "function" })
        return Tuple.make(Array.of(functionEntry), Array.of(symbolEntry))
      }

      return pipe(
        resolvedSymbolAt(checker)(nameNode),
        Option.map(entriesForSymbol),
        Option.getOrElse(emptyExportEntries)
      )
    }

    return pipe(
      Option.fromNullishOr(declaration.name),
      Option.map(entriesForName),
      Option.getOrElse(emptyExportEntries)
    )
  }

const generalizedExportEntries =
  (checker: ts.TypeChecker) =>
  (kind: ExportedSymbolKind) =>
  (declaration: ts.DeclarationStatement): ExportEntries => {
    if (!hasExportModifier(declaration)) {
      return emptyExportEntries()
    }

    const symbolEntryForName = (nameNode: ts.Identifier) => {
      const makeEntry = (symbol: ts.Symbol) => new ExportedSymbolEntry({ symbol, nameNode, kind })

      return pipe(resolvedSymbolAt(checker)(nameNode), Option.map(makeEntry), Option.toArray)
    }

    const symbolEntries = pipe(
      Option.fromNullishOr(declaration.name),
      Option.filter(ts.isIdentifier),
      Option.toArray,
      Array.flatMap(symbolEntryForName)
    )

    return Tuple.make(Array.empty(), symbolEntries)
  }

const exportEntriesForStatement = (checker: ts.TypeChecker) => (statement: ts.Statement) => {
  if (ts.isVariableStatement(statement)) {
    return variableExportEntries(checker)(statement)
  }

  if (ts.isFunctionDeclaration(statement)) {
    return functionExportEntries(checker)(statement)
  }

  const generalizedEntries = generalizedExportEntries(checker)

  if (ts.isClassDeclaration(statement)) {
    return generalizedEntries("class")(statement)
  }

  const isTypeDeclaration =
    ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)
  if (isTypeDeclaration) {
    return generalizedEntries("type")(statement)
  }

  if (ts.isEnumDeclaration(statement)) {
    return generalizedEntries("value")(statement)
  }

  return emptyExportEntries()
}

const exportedEntries = (context: ProgramContext): ExportEntries => {
  const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))
  const statementEntries = Array.flatMap(projectFiles, (sourceFile) =>
    Array.map(sourceFile.statements, exportEntriesForStatement(context.checker))
  )

  return Tuple.make(
    Array.flatMap(statementEntries, Tuple.get(0)),
    Array.flatMap(statementEntries, Tuple.get(1))
  )
}

const isInsideDeclaration = (declaration: ts.Declaration) => (node: ts.Identifier) => {
  const nodeSourceFile = node.getSourceFile()
  const declarationSourceFile = declaration.getSourceFile()
  const sameFile = strictEqual(declarationSourceFile)(nodeSourceFile)
  const afterStart = node.pos >= declaration.pos
  const beforeEnd = node.end <= declaration.end
  const checks = Array.make(sameFile, afterStart, beforeEnd)

  return Array.every(checks, Boolean)
}

const isOutsideDeclaration = (declaration: ts.Declaration) => (node: ts.Identifier) => {
  const insideDeclaration = isInsideDeclaration(declaration)(node)

  return !insideDeclaration
}

const referenceOutsideDeclaration = (entry: ExportedFunctionEntry) =>
  isOutsideDeclaration(entry.declarationNode)

const referenceOutsideDeclaringFile = (entry: ExportedSymbolEntry) => (node: ts.Identifier) =>
  !strictEqual(entry.nameNode.getSourceFile())(node.getSourceFile())

const buildExportIndexes = (context: ProgramContext) => {
  const [functionEntries, symbolEntries] = exportedEntries(context)
  const [functionUsages, symbolUsages] = buildDualUsageMaps(context)(
    functionEntries,
    referenceOutsideDeclaration,
    symbolEntries,
    referenceOutsideDeclaringFile
  )

  const exportReferenceIndex = new ExportReferenceIndex({
    entries: functionEntries,
    usages: functionUsages
  })

  const exportSymbolIndex = new ExportSymbolIndex({ entries: symbolEntries, usages: symbolUsages })
  return Tuple.make(exportReferenceIndex, exportSymbolIndex)
}

const emptyEvidenceCache = Option.none<CachedArchitectureEvidence>()
const evidenceCache = MutableRef.make(emptyEvidenceCache)

const buildArchitectureEvidence = (context: ProgramContext) => {
  const [exportReferenceIndex, exportSymbolIndex] = buildExportIndexes(context)
  const moduleEdges = buildModuleEdges(context)

  return new ArchitectureEvidence({ exportReferenceIndex, exportSymbolIndex, moduleEdges })
}

export const architectureEvidence = (context: ProgramContext) => {
  const cached = MutableRef.get(evidenceCache)

  const matchesProgram = flow(
    Struct.get<CachedArchitectureEvidence, "program">("program"),
    strictEqual(context.program)
  )

  const current = pipe(cached, Option.filter(matchesProgram))

  if (Option.isSome(current)) {
    return current.value.evidence
  }

  const evidence = buildArchitectureEvidence(context)
  const entry = new CachedArchitectureEvidence({ program: context.program, evidence })
  const updated = Option.some(entry)

  MutableRef.set(evidenceCache, updated)

  return evidence
}
