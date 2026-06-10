import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
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

export const noDuplicateFunctionNames: Rule = {
  id: ruleId,
  description:
    "Disallow top-level functions that duplicate a function name declared in another file.",
  check: (context) =>
    Effect.runSync(
      Stream.fromIterable(topLevelFunctions(context.sourceFile)).pipe(
        Stream.filterMap((candidate) => duplicateFunction(context, candidate)),
        Stream.map((duplicate) => duplicateFunctionMatch(context, duplicate)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const duplicateFunction = (
  context: RuleContext,
  candidate: TopLevelFunction
): Option.Option<DuplicateFunction> => {
  const declarations = declarationsForName(functionNameIndex(context.program), candidate.name)
  const otherFileNames = [...new Set(declarations.map((declared) => declared.fileName))].filter(
    (fileName) => fileName !== candidate.fileName
  )

  return otherFileNames.length > 0 ? Option.some({ candidate, otherFileNames }) : Option.none()
}

const functionNameIndexCache = new WeakMap<ts.Program, FunctionNameIndex>()

const functionNameIndex = (program: ts.Program): FunctionNameIndex =>
  Option.getOrElse(Option.fromNullable(functionNameIndexCache.get(program)), () =>
    buildFunctionNameIndex(program)
  )

const buildFunctionNameIndex = (program: ts.Program): FunctionNameIndex => {
  const index = functionsByName(
    program.getSourceFiles().filter(isProjectSourceFile).flatMap(topLevelFunctions)
  )

  functionNameIndexCache.set(program, index)

  return index
}

const isProjectSourceFile = (sourceFile: ts.SourceFile): boolean => {
  const isSkippableSourceFile = [
    sourceFile.isDeclarationFile,
    sourceFile.fileName.replaceAll("\\", "/").includes("/node_modules/")
  ].some(Boolean)

  return !isSkippableSourceFile
}

const functionsByName = (functions: ReadonlyArray<TopLevelFunction>): FunctionNameIndex =>
  functions.reduce(
    (index, declared) =>
      index.set(declared.name, [...declarationsForName(index, declared.name), declared]),
    new Map<string, ReadonlyArray<TopLevelFunction>>()
  )

const declarationsForName = (
  index: FunctionNameIndex,
  name: string
): ReadonlyArray<TopLevelFunction> =>
  Option.getOrElse(Option.fromNullable(index.get(name)), () => [])

const topLevelFunctions = (sourceFile: ts.SourceFile): ReadonlyArray<TopLevelFunction> =>
  sourceFile.statements.flatMap((statement) => statementFunctions(sourceFile, statement))

const statementFunctions = (
  sourceFile: ts.SourceFile,
  statement: ts.Statement
): ReadonlyArray<TopLevelFunction> => [
  ...variableStatementFunctions(sourceFile, statement),
  ...functionDeclarationFunctions(sourceFile, statement)
]

const variableStatementFunctions = (
  sourceFile: ts.SourceFile,
  statement: ts.Statement
): ReadonlyArray<TopLevelFunction> =>
  ts.isVariableStatement(statement)
    ? statement.declarationList.declarations.flatMap((declaration) =>
        Option.toArray(declaredFunction(sourceFile, declaration))
      )
    : []

const functionDeclarationFunctions = (
  sourceFile: ts.SourceFile,
  statement: ts.Statement
): ReadonlyArray<TopLevelFunction> =>
  ts.isFunctionDeclaration(statement)
    ? Option.toArray(namedFunctionDeclaration(sourceFile, statement))
    : []

const declaredFunction = (
  sourceFile: ts.SourceFile,
  declaration: ts.VariableDeclaration
): Option.Option<TopLevelFunction> =>
  functionInitializer(declaration).pipe(
    Option.flatMap(() => Option.liftPredicate(ts.isIdentifier)(declaration.name)),
    Option.map((nameNode) => toTopLevelFunction(sourceFile, nameNode))
  )

const namedFunctionDeclaration = (
  sourceFile: ts.SourceFile,
  declaration: ts.FunctionDeclaration
): Option.Option<TopLevelFunction> =>
  Option.map(Option.fromNullable(declaration.name), (nameNode) =>
    toTopLevelFunction(sourceFile, nameNode)
  )

const toTopLevelFunction = (
  sourceFile: ts.SourceFile,
  nameNode: ts.Identifier
): TopLevelFunction => ({
  name: nameNode.text,
  nameNode,
  fileName: sourceFile.fileName
})

const maxListedFileNames = 3

const formatFileNames = (projectRoot: string, fileNames: ReadonlyArray<string>): string => {
  const relativeFileNames = fileNames.map((fileName) => toRelativeFileName(projectRoot, fileName))
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

const duplicateFunctionMatch = (context: RuleContext, duplicate: DuplicateFunction): RuleMatch => {
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
