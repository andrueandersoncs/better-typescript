import { Array, HashMap, HashSet, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { onFile } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import {
  conciseArrowBody,
  functionInitializer,
  isFunctionInitializer,
  isProjectSourceFile
} from "./tsNode.js"
import { astChildren } from "./traverse.js"
import {
  TsIdentifier,
  TsFunctionDeclarationNode,
  TsSymbol
} from "./tsSchema.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-single-use-callee"

class FunctionEntry extends Schema.Class<FunctionEntry>("FunctionEntry")({
  nameNode: TsIdentifier,
  declarationNode: TsFunctionDeclarationNode,
  isCurried: Schema.Boolean,
  isExported: Schema.Boolean
}) {}

// Export detection

const isExportKeyword = (modifier: ts.Modifier): boolean =>
  modifier.kind === ts.SyntaxKind.ExportKeyword

const hasExportModifier = (statement: ts.Statement): boolean =>
  (ts.canHaveModifiers(statement)
    ? (ts.getModifiers(statement) ?? [])
    : []
  ).some(isExportKeyword)

// Currying detection

const unwrapParenthesized = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression)
    ? unwrapParenthesized(expression.expression)
    : expression

const hasCurriedBody = (arrow: ts.ArrowFunction): boolean =>
  pipe(
    conciseArrowBody(arrow),
    Option.map(unwrapParenthesized),
    Option.exists(isFunctionInitializer)
  )

const isCurriedArrow = (initializer: ts.Expression): boolean =>
  pipe(
    Option.liftPredicate(ts.isArrowFunction)(initializer),
    Option.exists(hasCurriedBody)
  )

// Entry collection: variable declarations

const variableEntryFromNameNode =
  (statement: ts.VariableStatement) =>
  (declaration: ts.VariableDeclaration) =>
  (nameNode: ts.Identifier): FunctionEntry => {
    const isCurried = pipe(
      Option.fromNullable(declaration.initializer),
      Option.exists(isCurriedArrow)
    )
    const isExported = hasExportModifier(statement)

    return new FunctionEntry({
      nameNode,
      declarationNode: declaration,
      isCurried,
      isExported
    })
  }

const discardValue =
  (declaration: ts.VariableDeclaration) =>
  (_initializer: ts.Expression): Option.Option<ts.Identifier> =>
    Option.liftPredicate(ts.isIdentifier)(declaration.name)

const variableDeclarationEntry =
  (statement: ts.VariableStatement) =>
  (declaration: ts.VariableDeclaration): Option.Option<FunctionEntry> =>
    pipe(
      functionInitializer(declaration),
      Option.flatMap(discardValue(declaration)),
      Option.map(variableEntryFromNameNode(statement)(declaration))
    )

// Entry collection: function declarations

const functionEntryFromNameNode =
  (declaration: ts.FunctionDeclaration) =>
  (nameNode: ts.Identifier): FunctionEntry => {
    const isExported = hasExportModifier(declaration)

    return new FunctionEntry({
      nameNode,
      declarationNode: declaration,
      isCurried: false,
      isExported
    })
  }

const namedFunctionEntry = (
  declaration: ts.FunctionDeclaration
): Option.Option<FunctionEntry> =>
  pipe(
    Option.fromNullable(declaration.name),
    Option.map(functionEntryFromNameNode(declaration))
  )

// Combined entry collection

const statementEntries = (
  statement: ts.Statement
): ReadonlyArray<FunctionEntry> => {
  const variableEntries = ts.isVariableStatement(statement)
    ? Array.filterMap(
        statement.declarationList.declarations,
        variableDeclarationEntry(statement)
      )
    : []
  const functionEntries = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(statement),
    Option.flatMap(namedFunctionEntry),
    Option.toArray
  )

  return Array.appendAll(variableEntries, functionEntries)
}

const sourceFileEntries = (
  sourceFile: ts.SourceFile
): ReadonlyArray<FunctionEntry> =>
  sourceFile.statements.flatMap(statementEntries)

// Reference classification

class SymbolClassification extends Schema.Class<SymbolClassification>(
  "SymbolClassification"
)({
  calleeCount: Schema.Number,
  disqualified: Schema.Boolean
}) {}

type Classifications = HashMap.HashMap<ts.Symbol, SymbolClassification>
type ClassificationFolder = (
  classifications: Classifications,
  node: ts.Node
) => Classifications


const emptyClassification = new SymbolClassification({
  calleeCount: 0,
  disqualified: false
})

const emptyClassifications: Classifications = HashMap.empty()

const fallbackEmptyClassification = (): SymbolClassification =>
  emptyClassification

const disqualifiedClassification = new SymbolClassification({
  calleeCount: 0,
  disqualified: true
})

const declarationNameNode = (entry: FunctionEntry): ts.Node =>
  entry.declarationNode.name ?? entry.nameNode

const matchesNode =
  (node: ts.Identifier) =>
  (declName: ts.Node): boolean =>
    node === declName

const isDeclarationIdentifier =
  (symbolToEntry: HashMap.HashMap<ts.Symbol, FunctionEntry>) =>
  (node: ts.Identifier) =>
  (sym: ts.Symbol): boolean =>
    pipe(
      HashMap.get(symbolToEntry, sym),
      Option.map(declarationNameNode),
      Option.exists(matchesNode(node))
    )

const isCallExpression = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node)

const isCalleeOf =
  (node: ts.Identifier) =>
  (call: ts.CallExpression): boolean =>
    call.expression === node

const classifyTrackedRef =
  (sym: ts.Symbol) =>
  (node: ts.Identifier) =>
  (classifications: Classifications): Classifications => {
    if (
      pipe(
        Option.liftPredicate(isCallExpression)(node.parent),
        Option.exists(isCalleeOf(node))
      )
    ) {
      const current = pipe(
        HashMap.get(classifications, sym),
        Option.getOrElse(fallbackEmptyClassification)
      )
      const updated = new SymbolClassification({
        calleeCount: current.calleeCount + 1,
        disqualified: current.disqualified
      })

      return HashMap.set(classifications, sym, updated)
    }
    return HashMap.set(classifications, sym, disqualifiedClassification)
  }

const isTrackedSymbol =
  (symbolToEntry: HashMap.HashMap<ts.Symbol, FunctionEntry>) =>
  (sym: ts.Symbol): boolean =>
    HashMap.has(symbolToEntry, sym)

const isNotDeclaration =
  (symbolToEntry: HashMap.HashMap<ts.Symbol, FunctionEntry>) =>
  (node: ts.Identifier) =>
  (sym: ts.Symbol): boolean =>
    !isDeclarationIdentifier(symbolToEntry)(node)(sym)

const applyTrackedRef =
  (classifications: Classifications) =>
  (node: ts.Identifier) =>
  (sym: ts.Symbol): Classifications =>
    classifyTrackedRef(sym)(node)(classifications)

const fallbackClassifications =
  (classifications: Classifications) => (): Classifications =>
    classifications

const classifyIdentifierRef =
  (checker: ts.TypeChecker) =>
  (symbolToEntry: HashMap.HashMap<ts.Symbol, FunctionEntry>) =>
  (classifications: Classifications) =>
  (node: ts.Identifier): Classifications => {
    const sym = checker.getSymbolAtLocation(node)
    const symOption = Option.fromNullable(sym)
    const trackedSym = Option.filter(symOption, isTrackedSymbol(symbolToEntry))
    const nonDeclSym = Option.filter(
      trackedSym,
      isNotDeclaration(symbolToEntry)(node)
    )

    return pipe(
      nonDeclSym,
      Option.map(applyTrackedRef(classifications)(node)),
      Option.getOrElse(fallbackClassifications(classifications))
    )
  }

// Tree folding

const foldDescendants =
  (folder: ClassificationFolder): ClassificationFolder =>
  (classifications, node) => {
    const afterSelf = folder(classifications, node)
    const children = astChildren(node)

    return Array.reduce(children, afterSelf, foldDescendants(folder))
  }

const classifyIdentifierNode =
  (checker: ts.TypeChecker) =>
  (symbolToEntry: HashMap.HashMap<ts.Symbol, FunctionEntry>): ClassificationFolder =>
  (classifications, node) =>
    ts.isIdentifier(node)
      ? classifyIdentifierRef(checker)(symbolToEntry)(classifications)(node)
      : classifications

const isSingleCalleeEntry = (classification: SymbolClassification): boolean => {
  const isSingleCallee = classification.calleeCount === 1
  const isNotDisqualified = !classification.disqualified
  const isSingleAndQualified = isSingleCallee && isNotDisqualified

  return isSingleAndQualified
}

const symbolForEntry =
  (checker: ts.TypeChecker) =>
  (entry: FunctionEntry): Option.Option<ts.Symbol> => {
    const sym = checker.getSymbolAtLocation(entry.nameNode)

    return Option.fromNullable(sym)
  }

const pairWithEntry =
  (entry: FunctionEntry) =>
  (sym: ts.Symbol): [ts.Symbol, FunctionEntry] => [sym, entry]

const entryToSymbolPair =
  (checker: ts.TypeChecker) =>
  (entry: FunctionEntry): Option.Option<[ts.Symbol, FunctionEntry]> =>
    pipe(symbolForEntry(checker)(entry), Option.map(pairWithEntry(entry)))

// Index caching

const functionEntryArraySchema = Schema.Array(FunctionEntry)
const symbolHashSetSchema = Schema.HashSetFromSelf(TsSymbol)

class ReferenceIndex extends Schema.Class<ReferenceIndex>("ReferenceIndex")({
  entries: functionEntryArraySchema,
  calleeOnlySymbols: symbolHashSetSchema
}) {}

const referenceIndexCache = new WeakMap<ts.Program, ReferenceIndex>()

const orBuildReferenceIndex =
  (program: ts.Program) =>
  (checker: ts.TypeChecker) => (): ReferenceIndex => {
    const projectFiles = program.getSourceFiles().filter(isProjectSourceFile)
    const entries = projectFiles.flatMap(sourceFileEntries)
    const symbolEntryPairs = Array.filterMap(
      entries,
      entryToSymbolPair(checker)
    )
    const symbolToEntry = HashMap.fromIterable(symbolEntryPairs)
    const folder = foldDescendants(
      classifyIdentifierNode(checker)(symbolToEntry)
    )
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
    const index = new ReferenceIndex({ entries, calleeOnlySymbols })

    referenceIndexCache.set(program, index)

    return index
  }

// Match generation
const symbolInSet =
  (calleeOnlySymbols: HashSet.HashSet<ts.Symbol>) =>
  (sym: ts.Symbol): boolean =>
    HashSet.has(calleeOnlySymbols, sym)

const entryIsNotCurried =
  (entry: FunctionEntry) =>
  (_sym: ts.Symbol): boolean =>
    !entry.isCurried

const entryIsNotExported =
  (entry: FunctionEntry) =>
  (_sym: ts.Symbol): boolean =>
    !entry.isExported

const symbolIsFlaggable =
  (calleeOnlySymbols: HashSet.HashSet<ts.Symbol>) =>
  (checker: ts.TypeChecker) =>
  (entry: FunctionEntry): boolean =>
    pipe(
      symbolForEntry(checker)(entry),
      Option.filter(symbolInSet(calleeOnlySymbols)),
      Option.filter(entryIsNotCurried(entry)),
      Option.filter(entryIsNotExported(entry)),
      Option.isSome
    )

const singleUseCalleeMatch =
  (context: RuleContext) =>
  (entry: FunctionEntry): RuleMatch =>
    createRuleMatch(context)({
      ruleId,
      node: entry.nameNode,
      message: "Avoid naming a function that is only called in one place.",
      hint:
        "This function has a single call site and is not passed by reference anywhere. " +
        "Inline its body at the call site to reduce indirection. If the function exists " +
        "for documentation, a comment at the call site conveys the same intent without " +
        "the abstraction cost."
    })

const isInFile =
  (sourceFile: ts.SourceFile) =>
  (entry: FunctionEntry): boolean =>
    entry.nameNode.getSourceFile().fileName === sourceFile.fileName

const singleUseCalleeMatches = (
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const cached = referenceIndexCache.get(context.program)
  const index = pipe(
    Option.fromNullable(cached),
    Option.getOrElse(orBuildReferenceIndex(context.program)(context.checker))
  )

  return pipe(
    index.entries,
    Array.filter(isInFile(context.sourceFile)),
    Array.filter(symbolIsFlaggable(index.calleeOnlySymbols)(context.checker)),
    Array.map(singleUseCalleeMatch(context))
  )
}

const check = onFile(singleUseCalleeMatches)

const badExample = new ExampleSnippet({
  filePath: "src/validate.ts",
  code: `const isPositive = (n: number): boolean =>
  n > 0

const validateAge = (age: number): boolean =>
  isPositive(age) // isPositive is only called here`
})

const goodExample = new ExampleSnippet({
  filePath: "src/validate.ts",
  code: `const validateAge = (age: number): boolean =>
  age > 0`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noSingleUseCallee = new Rule({
  id: ruleId,
  description:
    "Disallow non-curried, non-exported functions that are only called in one place " +
    "and never passed by reference.",
  example,
  check
})
