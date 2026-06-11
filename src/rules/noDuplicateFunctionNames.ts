import { Array, Option } from "effect"
import * as ts from "typescript"
import { onFile } from "./ruleCheck.js"
import { createRuleMatch, toRelativeFileName } from "./ruleMatch.js"
import { functionInitializer, isProjectSourceFile } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-duplicate-function-names"

// A top-level function is represented by its name identifier: the name text and the
// declaring file are both derivable from the node, so no wrapper record is needed.
type FunctionNameIndex = ReadonlyMap<string, ReadonlyArray<ts.Identifier>>

const declaredFunction = (declaration: ts.VariableDeclaration): Option.Option<ts.Identifier> =>
  Option.gen(function* () {
    yield* functionInitializer(declaration)

    return yield* Option.liftPredicate(ts.isIdentifier)(declaration.name)
  })

const namedFunctionDeclaration = (
  declaration: ts.FunctionDeclaration
): Option.Option<ts.Identifier> => Option.fromNullable(declaration.name)

const variableStatementFunctions = (statement: ts.Statement): ReadonlyArray<ts.Identifier> =>
  ts.isVariableStatement(statement)
    ? Array.filterMap(statement.declarationList.declarations, declaredFunction)
    : []

const functionDeclarationFunctions = (statement: ts.Statement): ReadonlyArray<ts.Identifier> =>
  ts.isFunctionDeclaration(statement) ? Option.toArray(namedFunctionDeclaration(statement)) : []

const statementFunctions = (statement: ts.Statement): ReadonlyArray<ts.Identifier> => [
  ...variableStatementFunctions(statement),
  ...functionDeclarationFunctions(statement)
]

const topLevelFunctions = (sourceFile: ts.SourceFile): ReadonlyArray<ts.Identifier> =>
  sourceFile.statements.flatMap(statementFunctions)

const declarationsForName = (
  index: FunctionNameIndex,
  name: string
): ReadonlyArray<ts.Identifier> => index.get(name) ?? []

const addFunctionToIndex = (
  index: Map<string, ReadonlyArray<ts.Identifier>>,
  nameNode: ts.Identifier
): Map<string, ReadonlyArray<ts.Identifier>> =>
  index.set(nameNode.text, [...declarationsForName(index, nameNode.text), nameNode])

const functionsByName = (functions: ReadonlyArray<ts.Identifier>): FunctionNameIndex =>
  functions.reduce(addFunctionToIndex, new Map<string, ReadonlyArray<ts.Identifier>>())

const functionNameIndexCache = new WeakMap<ts.Program, FunctionNameIndex>()

const buildFunctionNameIndex = (program: ts.Program): FunctionNameIndex => {
  const index = functionsByName(
    program.getSourceFiles().filter(isProjectSourceFile).flatMap(topLevelFunctions)
  )

  functionNameIndexCache.set(program, index)

  return index
}

const functionNameIndex = (program: ts.Program): FunctionNameIndex => {
  const cached = Option.fromNullable(functionNameIndexCache.get(program))

  return Option.isSome(cached) ? cached.value : buildFunctionNameIndex(program)
}

const declaredFileName = (nameNode: ts.Identifier): string => nameNode.getSourceFile().fileName

const isOtherFileName =
  (candidateFileName: string) =>
  (fileName: string): boolean =>
    fileName !== candidateFileName

const maxListedFileNames = 3

const formatFileNames = (projectRoot: string, fileNames: ReadonlyArray<string>): string => {
  const relativeFileNames = fileNames.map(toRelativeFileName(projectRoot))
  const listedFileNames = relativeFileNames.slice(0, maxListedFileNames).join(", ")
  const remainingCount = relativeFileNames.length - maxListedFileNames

  return remainingCount > 0
    ? `${listedFileNames} and ${moreFilesSuffix(remainingCount)}`
    : listedFileNames
}

const moreFilesSuffix = (remainingCount: number): string => {
  const isSingleFile = remainingCount === 1

  return isSingleFile ? "1 more file" : `${remainingCount} more files`
}

const duplicateFunctionMatch = (
  context: RuleContext,
  candidate: ts.Identifier,
  otherFileNames: ReadonlyArray<string>
): RuleMatch => {
  const functionName = candidate.text
  const otherFiles = formatFileNames(context.projectRoot, otherFileNames)

  return createRuleMatch(context, {
    ruleId,
    node: candidate,
    message: `Avoid declaring the top-level function ${functionName} in multiple files.`,
    hint:
      `${functionName} is also declared in ${otherFiles}. Extract one shared implementation ` +
      "into a module scoped to its domain and import it from every file that uses it. Name " +
      "the module after the concept it serves (ts.Node helpers belong in ts-node.ts), not a " +
      "generic lib.ts or utils.ts."
  })
}

const candidateRuleMatch =
  (context: RuleContext) =>
  (candidate: ts.Identifier): Option.Option<RuleMatch> => {
    const declarations = declarationsForName(functionNameIndex(context.program), candidate.text)
    const otherFileNames = [...new Set(declarations.map(declaredFileName))].filter(
      isOtherFileName(context.sourceFile.fileName)
    )

    return otherFileNames.length > 0
      ? Option.some(duplicateFunctionMatch(context, candidate, otherFileNames))
      : Option.none()
  }

const duplicateFunctionMatches = (context: RuleContext): ReadonlyArray<RuleMatch> =>
  Array.filterMap(topLevelFunctions(context.sourceFile), candidateRuleMatch(context))

export const noDuplicateFunctionNames = new Rule({
  id: ruleId,
  description:
    "Disallow top-level functions that duplicate a function name declared in another file.",
  check: onFile(duplicateFunctionMatches)
})
