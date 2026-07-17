import * as path from "node:path"
import {
  Array,
  Data,
  Function,
  HashMap,
  Option,
  Match,
  Predicate,
  Struct,
  Tuple,
  pipe,
  Result
} from "effect"
import * as ts from "typescript"
import { hasExportModifier, functionInitializer, resolvedSymbolAt } from "../support/tsNode.js"
import { type ReferenceKey, referenceKey } from "../support/referenceKey.js"
import { foldAst, isProjectSourceFile } from "@better-typescript/core/engine/sources"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

// ExportedFunctionEntry binds a symbol to nodes because checks share identity.
export class ExportedFunctionEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly nameNode: ts.Identifier
  readonly declarationNode: ts.Declaration
  readonly functionNode: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
}> {}

// ExportedSymbolKind is shared because TypeScript declarations do not expose this evidence kind.
export type ExportedSymbolKind = "function" | "class" | "type" | "value"

// Generalized exports are shared because exportSurface inventories non-functions.
export class ExportedSymbolEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly nameNode: ts.Identifier
  readonly declarationNode: ts.Declaration
  readonly kind: ExportedSymbolKind
}> {}

// ExportUsage is shared prod-vs-test usage because checks share one split.
class ExportUsage extends Data.Class<{
  readonly productionCallCount: number
  readonly testCallCount: number
  readonly productionPaths: ReadonlyArray<string>
  readonly testPaths: ReadonlyArray<string>
  readonly hasProductionNonCallReference: boolean
}> {}

// ExportReferenceIndex joins entries to usage by symbol because checks need one inventory.
export class ExportReferenceIndex extends Data.Class<{
  readonly entries: ReadonlyArray<ExportedFunctionEntry>
  readonly usages: HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage>
}> {}

// Generalized exports have their own index because home-file references are excluded.
export class ExportSymbolIndex extends Data.Class<{
  readonly entries: ReadonlyArray<ExportedSymbolEntry>
  readonly usages: HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage>
}> {}

// ModuleEdge is the shared normalized import edge because graph checks need it.
export class ModuleEdge extends Data.Class<{
  readonly importerPath: string
  readonly importedPath: string
  readonly fromTest: boolean
}> {}

const emptyUsage = () => {
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

// Benchmarks are test-like because derivation must distinguish them from production callers.
export const isTestPath = (relativePath: string) => {
  const normalized = relativePath.replaceAll("\\", "/")
  const testLikeDirectories = Array.make("bench/", "test/", "tests/", "__tests__/")
  const testSuffixes = Array.make(".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx")

  const inTestLikeDirectory = Array.some(
    testLikeDirectories,
    (directory) => normalized.startsWith(directory) || normalized.includes(`/${directory}`)
  )

  const hasTestSuffix = Array.some(testSuffixes, (suffix) => normalized.endsWith(suffix))

  return inTestLikeDirectory || hasTestSuffix
}

// Workspace paths normalize evidence because cross-package joins compare one path vocabulary.
export const toWorkspacePath =
  (projectRoot: string, workspaceRoot: string) => (projectRelativePath: string) => {
    const projectPath = path.resolve(projectRoot, projectRelativePath)
    const workspacePath = path.relative(workspaceRoot, projectPath)

    return workspacePath.replaceAll(path.sep, "/")
  }

export const isTestSourceFile = (root: string) => (sourceFile: ts.SourceFile) =>
  pipe(sourceFile.fileName, (fileName) => path.relative(root, fileName), isTestPath)

export const importElements =
  <Context, Element>(
    elementFor: (
      context: Context
    ) => (node: ts.ImportDeclaration) => (specifier: string) => Option.Option<Element>
  ) =>
  (context: Context) => {
    const elementForImport = elementFor(context)

    const elementsForImport = (node: ts.ImportDeclaration): ReadonlyArray<Element> => {
      const elementForSpecifier = elementForImport(node)

      return pipe(
        Option.fromNullishOr(node.moduleSpecifier),
        Option.filter(ts.isStringLiteral),
        Option.map(Struct.get("text")),
        Option.flatMap(elementForSpecifier),
        Option.toArray
      )
    }

    return elementsForImport
  }

const variableFunctionEntries =
  (checker: ts.TypeChecker) =>
  (statement: ts.VariableStatement): ReadonlyArray<ExportedFunctionEntry> => {
    if (!hasExportModifier(statement)) {
      return Array.empty()
    }

    return Array.filterMap(statement.declarationList.declarations, (declaration) =>
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
        ),
        Result.fromOption(Function.constVoid)
      )
    )
  }

const functionDeclarationEntry =
  (checker: ts.TypeChecker) =>
  (declaration: ts.FunctionDeclaration): Option.Option<ExportedFunctionEntry> => {
    if (!hasExportModifier(declaration)) {
      return Option.none()
    }

    return pipe(
      Option.fromNullishOr(declaration.name),
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

const namedExportEntry =
  (checker: ts.TypeChecker) =>
  (nameNode: ts.Identifier, declarationNode: ts.Declaration, kind: ExportedSymbolKind) =>
    pipe(
      resolvedSymbolAt(checker)(nameNode),
      Option.map(
        (symbol) =>
          new ExportedSymbolEntry({
            symbol,
            nameNode,
            declarationNode,
            kind
          })
      )
    )

const variableSymbolEntries =
  (checker: ts.TypeChecker) =>
  (statement: ts.VariableStatement): ReadonlyArray<ExportedSymbolEntry> => {
    if (!hasExportModifier(statement)) {
      return Array.empty()
    }

    return Array.filterMap(statement.declarationList.declarations, (declaration) =>
      pipe(
        Option.liftPredicate(ts.isIdentifier)(declaration.name),
        Option.flatMap((nameNode) => {
          const initializer = functionInitializer(declaration)
          const kind: ExportedSymbolKind = Option.isSome(initializer) ? "function" : "value"

          return namedExportEntry(checker)(nameNode, declaration, kind)
        }),
        Result.fromOption(Function.constVoid)
      )
    )
  }

const noExportedSymbolEntries: ReadonlyArray<ExportedSymbolEntry> = Array.empty()

const symbolEntriesForDeclaration =
  (checker: ts.TypeChecker) =>
  (kind: ExportedSymbolKind) =>
  (declaration: ts.DeclarationStatement): ReadonlyArray<ExportedSymbolEntry> => {
    if (!hasExportModifier(declaration)) {
      return noExportedSymbolEntries
    }

    return pipe(
      Option.fromNullishOr(declaration.name),
      Option.filter(ts.isIdentifier),
      Option.flatMap((nameNode) => namedExportEntry(checker)(nameNode, declaration, kind)),
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
    Match.type<ts.Statement>(),
    Match.when(ts.isVariableStatement, variableEntries),
    Match.when(ts.isFunctionDeclaration, functionEntries),
    Match.when(ts.isClassDeclaration, classEntries),
    Match.when(ts.isInterfaceDeclaration, interfaceEntries),
    Match.when(ts.isTypeAliasDeclaration, typeAliasEntries),
    Match.when(ts.isEnumDeclaration, enumEntries),
    Match.orElse(Function.constant(noExportedSymbolEntries))
  )
}

const exportedSymbolsIn =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<ExportedSymbolEntry> =>
    Array.flatMap(sourceFile.statements, exportedSymbolEntriesFor(checker))

const isImportBinding = (node: ts.Identifier) => {
  const parent = node.parent
  const isImportSpecifier = ts.isImportSpecifier(parent)
  const isImportClause = ts.isImportClause(parent)
  const isNamespaceImport = ts.isNamespaceImport(parent)
  const isImportEquals = ts.isImportEqualsDeclaration(parent)
  const checks = Array.make(isImportSpecifier, isImportClause, isNamespaceImport, isImportEquals)

  return Array.some(checks, Boolean)
}

const isDirectCallReference = (node: ts.Identifier) => {
  const parent = node.parent

  const directCall = pipe(
    Option.liftPredicate(ts.isCallExpression)(parent),
    Option.exists((call) => call.expression === node)
  )

  const propertyCall = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(parent),
    Option.exists((access) => {
      const hasReferencedName = access.name === node
      const callParent = Option.liftPredicate(ts.isCallExpression)(access.parent)

      const invokesAccess = pipe(
        callParent,
        Option.exists((call) => call.expression === access)
      )

      return hasReferencedName && invokesAccess
    })
  )

  return directCall || propertyCall
}

const isInsideDeclaration = (declaration: ts.Declaration) => (node: ts.Identifier) => {
  const sameFile = node.getSourceFile() === declaration.getSourceFile()
  const afterStart = node.pos >= declaration.pos
  const beforeEnd = node.end <= declaration.end
  const checks = Array.make(sameFile, afterStart, beforeEnd)

  return Array.every(checks, Boolean)
}

const isOutsideDeclaration = (declaration: ts.Declaration) => (node: ts.Identifier) => {
  const insideDeclaration = isInsideDeclaration(declaration)(node)

  return !insideDeclaration
}

const isOutsideDeclaringFile = (declaration: ts.Declaration) => (node: ts.Identifier) =>
  node.getSourceFile() !== declaration.getSourceFile()

const appendUnique =
  (value: string) =>
  (values: ReadonlyArray<string>): ReadonlyArray<string> =>
    Array.contains(values, value) ? values : Array.append(values, value)

const updateUsage = (isTest: boolean, isCall: boolean, path: string) => (usage: ExportUsage) => {
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
  readonly declarationNode: ts.Declaration
}

const buildUsageMap =
  (context: ProgramContext) =>
  (
    entries: ReadonlyArray<UsageScanEntry>,
    referenceFilter: (declaration: ts.Declaration) => (node: ts.Identifier) => boolean
  ): HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage> => {
    const checker = context.checker
    const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))

    const entryPairs = Array.map(entries, (entry) => {
      const symbolKey = referenceKey(entry.symbol)

      return Tuple.make(symbolKey, entry)
    })

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

        return foldAst(
          (
            current: HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage>,
            node: ts.Node
          ): HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage> =>
            pipe(
              Option.liftPredicate(ts.isIdentifier)(node),
              Option.filter(Predicate.not(isImportBinding)),
              Option.flatMap((currentIdentifier) =>
                pipe(
                  resolvedSymbolAt(checker)(currentIdentifier),
                  Option.flatMap((symbol) => {
                    const symbolKey = referenceKey(symbol)

                    return HashMap.get(entriesBySymbol, symbolKey)
                  }),
                  Option.filter((candidate) =>
                    referenceFilter(candidate.declarationNode)(currentIdentifier)
                  ),
                  Option.map((candidate) => {
                    const candidateKey = referenceKey(candidate.symbol)

                    const usage = pipe(
                      HashMap.get(current, candidateKey),
                      Option.getOrElse(emptyUsage)
                    )

                    const isCall = isDirectCallReference(currentIdentifier)
                    const updated = updateUsage(fromTest, isCall, sourcePath)(usage)

                    return HashMap.set(current, candidateKey, updated)
                  })
                )
              ),
              Option.getOrElse(Function.constant(current))
            )
        )(sourceFile)(usages)
      }

    const initialUsages = HashMap.empty<ReferenceKey<ts.Symbol>, ExportUsage>()

    return Array.reduce(projectFiles, initialUsages, (current, sourceFile) =>
      scanFile(sourceFile)(current)
    )
  }

export const buildExportReferenceIndex = (context: ProgramContext) => {
  const checker = context.checker
  const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))
  const entries = Array.flatMap(projectFiles, exportedFunctionsIn(checker))
  const usages = buildUsageMap(context)(entries, isOutsideDeclaration)

  return new ExportReferenceIndex({ entries, usages })
}

export const buildExportSymbolIndex = (context: ProgramContext) => {
  const checker = context.checker
  const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))
  const entries = Array.flatMap(projectFiles, exportedSymbolsIn(checker))
  const usages = buildUsageMap(context)(entries, isOutsideDeclaringFile)

  return new ExportSymbolIndex({ entries, usages })
}

export const usageFor =
  (index: ExportReferenceIndex) =>
  (entry: ExportedFunctionEntry): ExportUsage => {
    const symbolKey = referenceKey(entry.symbol)

    return pipe(HashMap.get(index.usages, symbolKey), Option.getOrElse(emptyUsage))
  }

export const symbolUsageFor =
  (index: ExportSymbolIndex) =>
  (entry: ExportedSymbolEntry): ExportUsage => {
    const symbolKey = referenceKey(entry.symbol)

    return pipe(HashMap.get(index.usages, symbolKey), Option.getOrElse(emptyUsage))
  }

const moduleSourceFile =
  (context: ProgramContext, containingFile: ts.SourceFile) => (moduleSpecifier: ts.Expression) => {
    const checkerSource = pipe(
      context.checker.getSymbolAtLocation(moduleSpecifier),
      Option.fromNullishOr,
      Option.map((symbol) => symbol.declarations ?? Array.empty()),
      Option.flatMap((declarations) => Array.findFirst(declarations, ts.isSourceFile))
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

        return Option.fromNullishOr(resolution.resolvedModule)
      }),
      Option.flatMap((resolved) =>
        pipe(context.program.getSourceFile(resolved.resolvedFileName), Option.fromNullishOr)
      )
    )
  }

const statementModuleSpecifier = (statement: ts.Statement) => {
  if (ts.isImportDeclaration(statement)) {
    return Option.some(statement.moduleSpecifier)
  }

  return pipe(
    Option.liftPredicate(ts.isExportDeclaration)(statement),
    Option.flatMap((declaration) => pipe(declaration.moduleSpecifier, Option.fromNullishOr))
  )
}

export const buildModuleEdges = (context: ProgramContext): ReadonlyArray<ModuleEdge> => {
  const relative = toRelativeFileName(context.projectRoot)
  const classifyTestSource = isTestSourceFile(context.workspaceRoot)
  const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))

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
        }),
        Result.fromOption(Function.constVoid)
      )
    )
  })
}
