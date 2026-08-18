import {
  Array,
  Function,
  HashMap,
  MutableRef,
  Match as EffectMatch,
  Option,
  Predicate,
  Result,
  Struct,
  Tuple,
  pipe,
  flow
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { ProgramContext } from "../../sources/data.js"
import type { AstFold } from "../../sources/astFold.js"
import { isProjectSourceFile } from "../../sources/isProjectSourceFile.js"
import { foldAst } from "../../sources/foldAst.js"
import { toRelativeFileName } from "../../support/paths.js"
import { referenceKey } from "../../support/referenceKey.js"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
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
import { ExportUsage } from "./exportUsage.js"
import { makeEmptyUsage } from "./makeEmptyUsage.js"

const moduleSourceFile =
  (context: ProgramContext) =>
  (containingFile: ts.SourceFile) =>
  (moduleSpecifier: ts.Expression) => {
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
        Option.flatMap(moduleSourceFile(context)(sourceFile)),
        Option.filter(isProjectSourceFile),
        Option.map(makeModuleEdgeForImportedFile),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(sourceFile.statements, edgeForStatement)
  }

  return Array.flatMap(projectFiles, edgesForSourceFile)
}

const exportedEntries = (context: ProgramContext) => {
  const noFunctionEntries = Array.empty<ExportedFunctionEntry>()
  const noSymbolEntries = Array.empty<ExportedSymbolEntry>()
  const makeEmptyExportEntries = () => Tuple.make(noFunctionEntries, noSymbolEntries)

  const variableExportEntries = (statement: ts.VariableStatement) => {
    if (!hasExportModifier(statement)) {
      return makeEmptyExportEntries()
    }

    const entriesForDeclaration = (declaration: ts.VariableDeclaration) => {
      const functionNode = functionInitializer(declaration)
      const kind: ExportedSymbolKind = Option.isSome(functionNode) ? "function" : "value"

      const entriesForName = (nameNode: ts.Identifier) => {
        const entriesForSymbol = (symbol: ts.Symbol) => {
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

          const symbolEntries = Array.of(symbolEntry)

          return Tuple.make(functionEntries, symbolEntries)
        }

        return pipe(
          resolvedSymbolAt(context.checker)(nameNode),
          Option.map(entriesForSymbol),
          Option.getOrElse(makeEmptyExportEntries)
        )
      }

      return pipe(
        Option.liftPredicate(ts.isIdentifier)(declaration.name),
        Option.map(entriesForName),
        Option.getOrElse(makeEmptyExportEntries)
      )
    }

    const declarationEntries = Array.map(
      statement.declarationList.declarations,
      entriesForDeclaration
    )

    const functionEntries = Array.flatMap(declarationEntries, Tuple.get(0))
    const symbolEntries = Array.flatMap(declarationEntries, Tuple.get(1))

    return Tuple.make(functionEntries, symbolEntries)
  }

  const functionExportEntries = (declaration: ts.FunctionDeclaration) => {
    if (!hasExportModifier(declaration)) {
      return makeEmptyExportEntries()
    }

    const entriesForName = (nameNode: ts.Identifier) => {
      const entriesForSymbol = (symbol: ts.Symbol) => {
        const functionEntry = new ExportedFunctionEntry({
          symbol,
          nameNode,
          declarationNode: declaration,
          functionNode: declaration
        })

        const symbolEntry = new ExportedSymbolEntry({ symbol, nameNode, kind: "function" })
        const functionEntries = Array.of(functionEntry)
        const symbolEntries = Array.of(symbolEntry)

        return Tuple.make(functionEntries, symbolEntries)
      }

      return pipe(
        resolvedSymbolAt(context.checker)(nameNode),
        Option.map(entriesForSymbol),
        Option.getOrElse(makeEmptyExportEntries)
      )
    }

    return pipe(
      Option.fromNullishOr(declaration.name),
      Option.map(entriesForName),
      Option.getOrElse(makeEmptyExportEntries)
    )
  }

  const generalizedExportEntries =
    (kind: ExportedSymbolKind) => (declaration: ts.DeclarationStatement) => {
      if (!hasExportModifier(declaration)) {
        return makeEmptyExportEntries()
      }

      const symbolEntriesForName = (nameNode: ts.Identifier) => {
        const makeEntry = (symbol: ts.Symbol) => new ExportedSymbolEntry({ symbol, nameNode, kind })

        return pipe(
          resolvedSymbolAt(context.checker)(nameNode),
          Option.map(makeEntry),
          Option.toArray
        )
      }

      const symbolEntries = pipe(
        Option.fromNullishOr(declaration.name),
        Option.filter(ts.isIdentifier),
        Option.toArray,
        Array.flatMap(symbolEntriesForName)
      )

      return Tuple.make(noFunctionEntries, symbolEntries)
    }

  const classExportEntries = generalizedExportEntries("class")
  const typeExportEntries = generalizedExportEntries("type")
  const valueExportEntries = generalizedExportEntries("value")

  const exportEntriesForStatement = pipe(
    EffectMatch.type<ts.Statement>(),
    EffectMatch.when(ts.isVariableStatement, variableExportEntries),
    EffectMatch.when(ts.isFunctionDeclaration, functionExportEntries),
    EffectMatch.when(ts.isClassDeclaration, classExportEntries),
    EffectMatch.when(ts.isInterfaceDeclaration, typeExportEntries),
    EffectMatch.when(ts.isTypeAliasDeclaration, typeExportEntries),
    EffectMatch.when(ts.isEnumDeclaration, valueExportEntries),
    EffectMatch.orElse(makeEmptyExportEntries)
  )

  const entriesForSourceFile = flow(
    Struct.get<ts.SourceFile, "statements">("statements"),
    Array.map(exportEntriesForStatement)
  )

  const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))
  const statementEntries = Array.flatMap(projectFiles, entriesForSourceFile)
  const functionEntries = Array.flatMap(statementEntries, Tuple.get(0))
  const symbolEntries = Array.flatMap(statementEntries, Tuple.get(1))

  return Tuple.make(functionEntries, symbolEntries)
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

const referenceOutsideDeclaringFile = (entry: ExportedSymbolEntry) => (node: ts.Identifier) => {
  const declaringFile = entry.nameNode.getSourceFile()
  const referenceFile = node.getSourceFile()

  return !strictEqual(declaringFile)(referenceFile)
}

const buildExportIndexes = (context: ProgramContext) => {
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
    (isTest: boolean) => (isCall: boolean) => (path: string) => (usage: ExportUsage) => {
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

  const usageEntriesBySymbol = <Entry extends { readonly symbol: ts.Symbol }>(
    entries: ReadonlyArray<Entry>
  ) => {
    const entryPair = (entry: Entry) => {
      const key = referenceKey(entry.symbol)

      return Tuple.make(key, entry)
    }

    return pipe(entries, Array.map(entryPair), HashMap.fromIterable)
  }

  const updateUsagesForSymbol =
    <Entry extends { readonly symbol: ts.Symbol }>(
      entriesBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, Entry>
    ) =>
    (referenceFilter: (entry: Entry) => (node: ts.Identifier) => boolean) =>
    (identifier: ts.Identifier) =>
    (symbol: ts.Symbol) =>
    (fromTest: boolean) =>
    (sourcePath: string) =>
    (usages: HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage>) => {
      const symbolKey = referenceKey(symbol)

      const updateUsages = () => {
        const usage = pipe(HashMap.get(usages, symbolKey), Option.getOrElse(makeEmptyUsage))
        const isCall = isDirectCallReference(identifier)
        const updated = makeUpdatedUsage(fromTest)(isCall)(sourcePath)(usage)

        return HashMap.set(usages, symbolKey, updated)
      }

      return pipe(
        HashMap.get(entriesBySymbol, symbolKey),
        Option.filter(Function.flip(referenceFilter)(identifier)),
        Option.map(updateUsages),
        Option.getOrElse(Function.constant(usages))
      )
    }

  const buildDualUsageMaps =
    <FirstEntry extends { readonly symbol: ts.Symbol }>(firstEntries: ReadonlyArray<FirstEntry>) =>
    (firstReferenceFilter: (entry: FirstEntry) => (node: ts.Identifier) => boolean) =>
    <SecondEntry extends { readonly symbol: ts.Symbol }>(
      secondEntries: ReadonlyArray<SecondEntry>
    ) =>
    (secondReferenceFilter: (entry: SecondEntry) => (node: ts.Identifier) => boolean) => {
      const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))
      const firstBySymbol = usageEntriesBySymbol(firstEntries)
      const secondBySymbol = usageEntriesBySymbol(secondEntries)
      const relative = toRelativeFileName(context.projectRoot)
      const classifyTestSource = isTestSourceFile(context.workspaceRoot)
      const emptyUsages = HashMap.empty<ReferenceKey<ts.Symbol>, ExportUsage>()
      const initial = Tuple.make(emptyUsages, emptyUsages)

      const scanFile =
        (sourceFile: ts.SourceFile) =>
        (usageMaps: typeof initial): typeof initial => {
          const sourcePath = relative(sourceFile.fileName)
          const fromTest = classifyTestSource(sourceFile)

          const foldNode: AstFold<typeof initial> = (current, node) => {
            const updateForIdentifier = (identifier: ts.Identifier) => {
              const makeUpdatedUsageMapsForSymbol = (symbol: ts.Symbol) => {
                const currentFirst = Tuple.get(current, 0)
                const currentSecond = Tuple.get(current, 1)

                const first =
                  updateUsagesForSymbol(firstBySymbol)(firstReferenceFilter)(identifier)(symbol)(
                    fromTest
                  )(sourcePath)(currentFirst)

                const second =
                  updateUsagesForSymbol(secondBySymbol)(secondReferenceFilter)(identifier)(symbol)(
                    fromTest
                  )(sourcePath)(currentSecond)

                return Tuple.make(first, second)
              }

              return pipe(
                resolvedSymbolAt(context.checker)(identifier),
                Option.map(makeUpdatedUsageMapsForSymbol),
                Option.getOrElse(Function.constant(current))
              )
            }

            return pipe(
              Option.liftPredicate(ts.isIdentifier)(node),
              Option.filter(Predicate.not(isImportBinding)),
              Option.map(updateForIdentifier),
              Option.getOrElse(Function.constant(current))
            )
          }

          return foldAst(foldNode)(sourceFile)(usageMaps)
        }

      return Array.reduce(projectFiles, initial, (current, sourceFile) =>
        scanFile(sourceFile)(current)
      )
    }

  const [functionEntries, symbolEntries] = exportedEntries(context)

  const [functionUsages, symbolUsages] = buildDualUsageMaps(functionEntries)(
    referenceOutsideDeclaration
  )(symbolEntries)(referenceOutsideDeclaringFile)

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
