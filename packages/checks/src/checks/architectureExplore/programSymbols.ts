import * as path from "node:path"
import {
  Array,
  Data,
  Function,
  HashMap,
  Option,
  Predicate,
  Struct,
  Tuple,
  pipe
} from "effect"
import * as ts from "typescript"
import { hasExportModifier, functionInitializer } from "../support/tsNode.js"
import {
  foldAst,
  isProjectSourceFile
} from "@better-typescript/core/engine/sources"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

export class ExportedFunctionEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly nameNode: ts.Identifier
  readonly declarationNode: ts.Declaration
  readonly functionNode:
    ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
}> {}

export class ExportUsage extends Data.Class<{
  readonly productionCallCount: number
  readonly testCallCount: number
  readonly productionPaths: ReadonlyArray<string>
  readonly testPaths: ReadonlyArray<string>
  readonly hasProductionNonCallReference: boolean
}> {}

export class ExportReferenceIndex extends Data.Class<{
  readonly entries: ReadonlyArray<ExportedFunctionEntry>
  readonly usages: HashMap.HashMap<ts.Symbol, ExportUsage>
}> {}

export class ModuleEdge extends Data.Class<{
  readonly importerPath: string
  readonly importedPath: string
  readonly fromTest: boolean
}> {}

const emptyUsage = (): ExportUsage => {
  const productionPaths = Array.empty<string>()
  const testPaths = Array.empty<string>()

  return new ExportUsage({
    productionCallCount: 0,
    testCallCount: 0,
    productionPaths,
    testPaths,
    hasProductionNonCallReference: false
  })
}

export const isTestSourceFile =
  (projectRoot: string) =>
  (sourceFile: ts.SourceFile): boolean => {
    const normalized = path
      .relative(projectRoot, sourceFile.fileName)
      .replaceAll("\\", "/")

    const testDirectories = Array.make("test/", "tests/", "__tests__/")

    const testSuffixes = Array.make(
      ".test.ts",
      ".test.tsx",
      ".spec.ts",
      ".spec.tsx"
    )

    const inTestDirectory = Array.some(
      testDirectories,
      (directory) =>
        normalized.startsWith(directory) || normalized.includes(`/${directory}`)
    )

    const hasTestSuffix = Array.some(testSuffixes, (suffix) =>
      normalized.endsWith(suffix)
    )

    return inTestDirectory || hasTestSuffix
  }

export const resolvedSymbolAt =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): Option.Option<ts.Symbol> =>
    pipe(
      checker.getSymbolAtLocation(node),
      Option.fromNullable,
      Option.map((symbol) => {
        const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

        return isAlias ? checker.getAliasedSymbol(symbol) : symbol
      })
    )

const variableFunctionEntries =
  (checker: ts.TypeChecker) =>
  (statement: ts.VariableStatement): ReadonlyArray<ExportedFunctionEntry> => {
    if (!hasExportModifier(statement)) {
      return Array.empty()
    }

    return Array.filterMap(
      statement.declarationList.declarations,
      (declaration) =>
        pipe(
          functionInitializer(declaration),
          Option.flatMap((functionNode) =>
            pipe(
              Option.liftPredicate(ts.isIdentifier)(declaration.name),
              Option.flatMap((nameNode) =>
                pipe(
                  resolvedSymbolAt(checker)(nameNode),
                  Option.map(
                    (symbol) =>
                      new ExportedFunctionEntry({
                        symbol,
                        nameNode,
                        declarationNode: declaration,
                        functionNode
                      })
                  )
                )
              )
            )
          )
        )
    )
  }

const functionDeclarationEntry =
  (checker: ts.TypeChecker) =>
  (
    declaration: ts.FunctionDeclaration
  ): Option.Option<ExportedFunctionEntry> => {
    if (!hasExportModifier(declaration)) {
      return Option.none()
    }

    return pipe(
      Option.fromNullable(declaration.name),
      Option.flatMap((nameNode) =>
        pipe(
          resolvedSymbolAt(checker)(nameNode),
          Option.map(
            (symbol) =>
              new ExportedFunctionEntry({
                symbol,
                nameNode,
                declarationNode: declaration,
                functionNode: declaration
              })
          )
        )
      )
    )
  }

const exportedFunctionsIn =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<ExportedFunctionEntry> =>
    Array.flatMap(sourceFile.statements, (statement) => {
      if (ts.isVariableStatement(statement)) {
        return variableFunctionEntries(checker)(statement)
      }

      return pipe(
        Option.liftPredicate(ts.isFunctionDeclaration)(statement),
        Option.flatMap(functionDeclarationEntry(checker)),
        Option.toArray
      )
    })

const isImportBinding = (node: ts.Identifier): boolean => {
  const parent = node.parent
  const isImportSpecifier = ts.isImportSpecifier(parent)
  const isImportClause = ts.isImportClause(parent)
  const isNamespaceImport = ts.isNamespaceImport(parent)
  const isImportEquals = ts.isImportEqualsDeclaration(parent)

  const checks = Array.make(
    isImportSpecifier,
    isImportClause,
    isNamespaceImport,
    isImportEquals
  )

  return Array.some(checks, Boolean)
}

const isDirectCallReference = (node: ts.Identifier): boolean => {
  const parent = node.parent

  const directCall = pipe(
    Option.liftPredicate(ts.isCallExpression)(parent),
    Option.exists((call) => call.expression === node)
  )

  const propertyCall = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(parent),
    Option.exists((access) => {
      const hasReferencedName = access.name === node

      const callParent = Option.liftPredicate(ts.isCallExpression)(
        access.parent
      )

      const invokesAccess = pipe(
        callParent,
        Option.exists((call) => call.expression === access)
      )

      return hasReferencedName && invokesAccess
    })
  )

  return directCall || propertyCall
}

const isInsideDeclaration =
  (declaration: ts.Declaration) =>
  (node: ts.Identifier): boolean => {
    const sameFile = node.getSourceFile() === declaration.getSourceFile()
    const afterStart = node.pos >= declaration.pos
    const beforeEnd = node.end <= declaration.end
    const checks = Array.make(sameFile, afterStart, beforeEnd)

    return Array.every(checks, Boolean)
  }

const appendUnique =
  (value: string) =>
  (values: ReadonlyArray<string>): ReadonlyArray<string> =>
    Array.contains(values, value) ? values : Array.append(values, value)

const updateUsage =
  (isTest: boolean, isCall: boolean, path: string) =>
  (usage: ExportUsage): ExportUsage => {
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

    const hasProductionNonCallReference =
      usage.hasProductionNonCallReference || nonCallReference

    return new ExportUsage({
      ...usage,
      productionCallCount: usage.productionCallCount + callIncrement,
      productionPaths,
      hasProductionNonCallReference
    })
  }

export const buildExportReferenceIndex = (
  context: ProgramContext
): ExportReferenceIndex => {
  const checker = context.checker

  const projectFiles = pipe(
    context.program.getSourceFiles(),
    Array.filter(isProjectSourceFile)
  )

  const entries = Array.flatMap(projectFiles, exportedFunctionsIn(checker))

  const entryPairs = Array.map(entries, (entry) =>
    Tuple.make(entry.symbol, entry)
  )

  const entriesBySymbol = HashMap.fromIterable(entryPairs)
  const currentEntryMap = entriesBySymbol
  const relative = toRelativeFileName(context.projectRoot)
  const classifyTestSource = isTestSourceFile(context.projectRoot)

  const scanFile =
    (sourceFile: ts.SourceFile) =>
    (
      usages: HashMap.HashMap<ts.Symbol, ExportUsage>
    ): HashMap.HashMap<ts.Symbol, ExportUsage> => {
      const sourcePath = relative(sourceFile.fileName)
      const fromTest = classifyTestSource(sourceFile)

      return foldAst(
        (
          current: HashMap.HashMap<ts.Symbol, ExportUsage>,
          node: ts.Node
        ): HashMap.HashMap<ts.Symbol, ExportUsage> =>
          pipe(
            Option.liftPredicate(ts.isIdentifier)(node),
            Option.filter(Predicate.not(isImportBinding)),
            Option.flatMap((currentIdentifier) =>
              pipe(
                resolvedSymbolAt(checker)(currentIdentifier),
                Option.flatMap((symbol) =>
                  HashMap.get(currentEntryMap, symbol)
                ),
                Option.filter((candidate) => {
                  const insideDeclaration = isInsideDeclaration(
                    candidate.declarationNode
                  )(currentIdentifier)

                  return !insideDeclaration
                }),
                Option.map((candidate) => {
                  const usage = pipe(
                    HashMap.get(current, candidate.symbol),
                    Option.getOrElse(emptyUsage)
                  )

                  const isCall = isDirectCallReference(currentIdentifier)

                  const updated = updateUsage(
                    fromTest,
                    isCall,
                    sourcePath
                  )(usage)

                  return HashMap.set(current, candidate.symbol, updated)
                })
              )
            ),
            Option.getOrElse(Function.constant(current))
          )
      )(sourceFile)(usages)
    }

  const initialUsages = HashMap.empty<ts.Symbol, ExportUsage>()

  const usages = Array.reduce(
    projectFiles,
    initialUsages,
    (current, sourceFile) => scanFile(sourceFile)(current)
  )

  return new ExportReferenceIndex({ entries, usages })
}

export const usageFor =
  (index: ExportReferenceIndex) =>
  (entry: ExportedFunctionEntry): ExportUsage =>
    pipe(HashMap.get(index.usages, entry.symbol), Option.getOrElse(emptyUsage))

const moduleSourceFile =
  (context: ProgramContext, containingFile: ts.SourceFile) =>
  (moduleSpecifier: ts.Expression): Option.Option<ts.SourceFile> => {
    const checkerSource = pipe(
      context.checker.getSymbolAtLocation(moduleSpecifier),
      Option.fromNullable,
      Option.map((symbol) => symbol.declarations ?? Array.empty()),
      Option.flatMap((declarations) =>
        Array.findFirst(declarations, ts.isSourceFile)
      )
    )

    if (Option.isSome(checkerSource)) {
      return checkerSource
    }

    const specifier = pipe(
      Option.liftPredicate(ts.isStringLiteralLike)(moduleSpecifier),
      Option.map(Struct.get("text"))
    )

    const compilerOptions = context.program.getCompilerOptions()

    return pipe(
      specifier,
      Option.flatMap((text) => {
        const resolution = ts.resolveModuleName(
          text,
          containingFile.fileName,
          compilerOptions,
          ts.sys
        )

        return Option.fromNullable(resolution.resolvedModule)
      }),
      Option.flatMap((resolved) =>
        pipe(
          context.program.getSourceFile(resolved.resolvedFileName),
          Option.fromNullable
        )
      )
    )
  }

const statementModuleSpecifier = (
  statement: ts.Statement
): Option.Option<ts.Expression> => {
  if (ts.isImportDeclaration(statement)) {
    return Option.some(statement.moduleSpecifier)
  }

  return pipe(
    Option.liftPredicate(ts.isExportDeclaration)(statement),
    Option.flatMap((declaration) =>
      pipe(declaration.moduleSpecifier, Option.fromNullable)
    )
  )
}

export const buildModuleEdges = (
  context: ProgramContext
): ReadonlyArray<ModuleEdge> => {
  const relative = toRelativeFileName(context.projectRoot)
  const classifyTestSource = isTestSourceFile(context.projectRoot)

  const projectFiles = pipe(
    context.program.getSourceFiles(),
    Array.filter(isProjectSourceFile)
  )

  return Array.flatMap(projectFiles, (sourceFile) => {
    const importerPath = relative(sourceFile.fileName)
    const fromTest = classifyTestSource(sourceFile)

    return Array.filterMap(sourceFile.statements, (statement) =>
      pipe(
        statementModuleSpecifier(statement),
        Option.flatMap(moduleSourceFile(context, sourceFile)),
        Option.filter(isProjectSourceFile),
        Option.map((importedFile) => {
          const importedPath = relative(importedFile.fileName)

          return new ModuleEdge({
            importerPath,
            importedPath,
            fromTest
          })
        })
      )
    )
  })
}
