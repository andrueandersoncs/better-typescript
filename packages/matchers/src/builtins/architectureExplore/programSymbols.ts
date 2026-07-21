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
  Result,
  flow
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { hasExportModifier, functionInitializer, resolvedSymbolAt } from "../../support/tsNode.js"
import { type ReferenceKey, referenceKey } from "../../support/referenceKey.js"
import { foldAst, isProjectSourceFile } from "@better-typescript/matchers/sources"
import { toRelativeFileName } from "../../support/paths.js"
import { isTestSourceFile } from "./paths.js"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"

// ExportedFunctionEntry binds a symbol to nodes because matchers share identity.
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

// ExportUsage is shared prod-vs-test usage because matchers share one split.
class ExportUsage extends Data.Class<{
  readonly productionCallCount: number
  readonly testCallCount: number
  readonly productionPaths: ReadonlyArray<string>
  readonly testPaths: ReadonlyArray<string>
  readonly hasProductionNonCallReference: boolean
}> {}

// ExportReferenceIndex joins entries to usage by symbol because matchers need one inventory.
export class ExportReferenceIndex extends Data.Class<{
  readonly entries: ReadonlyArray<ExportedFunctionEntry>
  readonly usages: HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage>
}> {}

// Generalized exports have their own index because home-file references are excluded.
export class ExportSymbolIndex extends Data.Class<{
  readonly entries: ReadonlyArray<ExportedSymbolEntry>
  readonly usages: HashMap.HashMap<ReferenceKey<ts.Symbol>, ExportUsage>
}> {}

const makeEmptyUsage = () => {
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

const variableFunctionEntries =
  (checker: ts.TypeChecker) =>
  (statement: ts.VariableStatement): ReadonlyArray<ExportedFunctionEntry> => {
    if (!hasExportModifier(statement)) {
      return Array.empty()
    }

    const entryForDeclaration = (declaration: ts.VariableDeclaration) => {
      const entryForFunction = (
        functionNode: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
      ) => {
        const entryForName = (nameNode: ts.Identifier) => {
          const makeExportedFunctionEntry = (symbol: ts.Symbol) =>
            new ExportedFunctionEntry({
              symbol,
              nameNode,
              declarationNode: declaration,
              functionNode
            })

          return pipe(resolvedSymbolAt(checker)(nameNode), Option.map(makeExportedFunctionEntry))
        }

        return pipe(
          Option.liftPredicate(ts.isIdentifier)(declaration.name),
          Option.flatMap(entryForName)
        )
      }

      return pipe(
        functionInitializer(declaration),
        Option.flatMap(entryForFunction),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(statement.declarationList.declarations, entryForDeclaration)
  }

const functionDeclarationEntry =
  (checker: ts.TypeChecker) =>
  (declaration: ts.FunctionDeclaration): Option.Option<ExportedFunctionEntry> => {
    if (!hasExportModifier(declaration)) {
      return Option.none()
    }

    const entryForName = (nameNode: ts.Identifier) => {
      const makeExportedFunctionEntry = (symbol: ts.Symbol) =>
        new ExportedFunctionEntry({
          symbol,
          nameNode,
          declarationNode: declaration,
          functionNode: declaration
        })

      return pipe(resolvedSymbolAt(checker)(nameNode), Option.map(makeExportedFunctionEntry))
    }

    return pipe(Option.fromNullishOr(declaration.name), Option.flatMap(entryForName))
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
  (nameNode: ts.Identifier, declarationNode: ts.Declaration, kind: ExportedSymbolKind) => {
    const makeExportedSymbolEntry = (symbol: ts.Symbol) =>
      new ExportedSymbolEntry({
        symbol,
        nameNode,
        declarationNode,
        kind
      })

    return pipe(resolvedSymbolAt(checker)(nameNode), Option.map(makeExportedSymbolEntry))
  }

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

        return namedExportEntry(checker)(nameNode, declaration, kind)
      }

      return pipe(
        Option.liftPredicate(ts.isIdentifier)(declaration.name),
        Option.flatMap(entryForName),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(statement.declarationList.declarations, entryForDeclaration)
  }

const noExportedSymbolEntries: ReadonlyArray<ExportedSymbolEntry> = Array.empty()

const symbolEntriesForDeclaration =
  (checker: ts.TypeChecker) =>
  (kind: ExportedSymbolKind) =>
  (declaration: ts.DeclarationStatement): ReadonlyArray<ExportedSymbolEntry> => {
    if (!hasExportModifier(declaration)) {
      return noExportedSymbolEntries
    }

    const entryForName = (nameNode: ts.Identifier) =>
      namedExportEntry(checker)(nameNode, declaration, kind)

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

  const expressionIsNode = flow(
    Struct.get<ts.CallExpression, "expression">("expression"),
    strictEqual(node)
  )

  const directCall = pipe(
    Option.liftPredicate(ts.isCallExpression)(parent),
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
    Option.liftPredicate(ts.isPropertyAccessExpression)(parent),
    Option.exists(accessInvokesNode)
  )

  return directCall || propertyCall
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

const isOutsideDeclaringFile = (declaration: ts.Declaration) => (node: ts.Identifier) =>
  node.getSourceFile() !== declaration.getSourceFile()

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

    const entryPair = (entry: UsageScanEntry) => {
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

            const matchesReferenceFilter = (candidate: UsageScanEntry) =>
              referenceFilter(candidate.declarationNode)(currentIdentifier)

            const updatedUsagesFor = (candidate: UsageScanEntry) => {
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
              resolvedSymbolAt(checker)(currentIdentifier),
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

    return pipe(HashMap.get(index.usages, symbolKey), Option.getOrElse(makeEmptyUsage))
  }

export const symbolUsageFor =
  (index: ExportSymbolIndex) =>
  (entry: ExportedSymbolEntry): ExportUsage => {
    const symbolKey = referenceKey(entry.symbol)

    return pipe(HashMap.get(index.usages, symbolKey), Option.getOrElse(makeEmptyUsage))
  }
