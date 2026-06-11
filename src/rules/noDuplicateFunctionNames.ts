import { Array, Option } from "effect"
import * as ts from "typescript"
import { onFile } from "./ruleCheck.js"
import { createRuleMatch, toRelativeFileName } from "./ruleMatch.js"
import { functionInitializer } from "./tsNode.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-duplicate-function-names"

interface TopLevelFunction {
  readonly name: string
  readonly nameNode: ts.Identifier
  readonly fileName: string
}

interface DuplicateFunction {
  readonly candidate: TopLevelFunction
  readonly otherFileNames: ReadonlyArray<string>
}

type FunctionNameIndex = ReadonlyMap<string, ReadonlyArray<TopLevelFunction>>

const toTopLevelFunction =
  (sourceFile: ts.SourceFile) =>
  (nameNode: ts.Identifier): TopLevelFunction => ({
    name: nameNode.text,
    nameNode,
    fileName: sourceFile.fileName
  })

const declaredFunction =
  (sourceFile: ts.SourceFile) =>
  (declaration: ts.VariableDeclaration): Option.Option<TopLevelFunction> =>
    Option.gen(function* () {
      yield* functionInitializer(declaration)
      const nameNode = yield* Option.liftPredicate(ts.isIdentifier)(declaration.name)

      return toTopLevelFunction(sourceFile)(nameNode)
    })

const namedFunctionDeclaration =
  (sourceFile: ts.SourceFile) =>
  (declaration: ts.FunctionDeclaration): Option.Option<TopLevelFunction> =>
    Option.map(Option.fromNullable(declaration.name), toTopLevelFunction(sourceFile))

const variableStatementFunctions = (
  sourceFile: ts.SourceFile,
  statement: ts.Statement
): ReadonlyArray<TopLevelFunction> =>
  ts.isVariableStatement(statement)
    ? Array.filterMap(statement.declarationList.declarations, declaredFunction(sourceFile))
    : []

const functionDeclarationFunctions = (
  sourceFile: ts.SourceFile,
  statement: ts.Statement
): ReadonlyArray<TopLevelFunction> =>
  ts.isFunctionDeclaration(statement)
    ? Option.toArray(namedFunctionDeclaration(sourceFile)(statement))
    : []

const statementFunctions =
  (sourceFile: ts.SourceFile) =>
  (statement: ts.Statement): ReadonlyArray<TopLevelFunction> => [
    ...variableStatementFunctions(sourceFile, statement),
    ...functionDeclarationFunctions(sourceFile, statement)
  ]

const topLevelFunctions = (sourceFile: ts.SourceFile): ReadonlyArray<TopLevelFunction> =>
  sourceFile.statements.flatMap(statementFunctions(sourceFile))

const isProjectSourceFile = (sourceFile: ts.SourceFile): boolean => {
  const isSkippableSourceFile = [
    sourceFile.isDeclarationFile,
    sourceFile.fileName.replaceAll("\\", "/").includes("/node_modules/")
  ].some(Boolean)

  return !isSkippableSourceFile
}

const declarationsForName = (
  index: FunctionNameIndex,
  name: string
): ReadonlyArray<TopLevelFunction> => index.get(name) ?? []

const addFunctionToIndex = (
  index: Map<string, ReadonlyArray<TopLevelFunction>>,
  declared: TopLevelFunction
): Map<string, ReadonlyArray<TopLevelFunction>> =>
  index.set(declared.name, [...declarationsForName(index, declared.name), declared])

const functionsByName = (functions: ReadonlyArray<TopLevelFunction>): FunctionNameIndex =>
  functions.reduce(addFunctionToIndex, new Map<string, ReadonlyArray<TopLevelFunction>>())

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

const declaredFileName = (declared: TopLevelFunction): string => declared.fileName

const isOtherFileName =
  (candidateFileName: string) =>
  (fileName: string): boolean =>
    fileName !== candidateFileName

const duplicateFunction = (
  context: RuleContext,
  candidate: TopLevelFunction
): Option.Option<DuplicateFunction> => {
  const declarations = declarationsForName(functionNameIndex(context.program), candidate.name)
  const otherFileNames = [...new Set(declarations.map(declaredFileName))].filter(
    isOtherFileName(candidate.fileName)
  )

  return otherFileNames.length > 0 ? Option.some({ candidate, otherFileNames }) : Option.none()
}

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

const duplicateFunctionMatch =
  (context: RuleContext) =>
  (duplicate: DuplicateFunction): RuleMatch => {
    const functionName = duplicate.candidate.name
    const otherFiles = formatFileNames(context.projectRoot, duplicate.otherFileNames)

    return createRuleMatch(context, {
      ruleId,
      node: duplicate.candidate.nameNode,
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
  (candidate: TopLevelFunction): Option.Option<RuleMatch> =>
    Option.map(duplicateFunction(context, candidate), duplicateFunctionMatch(context))

const duplicateFunctionMatches = (context: RuleContext): ReadonlyArray<RuleMatch> =>
  Array.filterMap(topLevelFunctions(context.sourceFile), candidateRuleMatch(context))

export const noDuplicateFunctionNames: Rule = {
  id: ruleId,
  description:
    "Disallow top-level functions that duplicate a function name declared in another file.",
  check: onFile(duplicateFunctionMatches)
}
