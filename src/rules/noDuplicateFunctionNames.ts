import { Array, Option } from "effect"
import * as ts from "typescript"
import { onFile } from "./ruleCheck.js"
import { createRuleMatch, toRelativeFileName } from "./ruleMatch.js"
import { functionInitializer, isProjectSourceFile } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-duplicate-function-names"

type FunctionNameIndex = ReadonlyMap<string, ReadonlyArray<ts.Identifier>>

const declaredFunction = (
  declaration: ts.VariableDeclaration
): Option.Option<ts.Identifier> =>
  Option.gen(function* () {
    yield* functionInitializer(declaration)

    return yield* Option.liftPredicate(ts.isIdentifier)(declaration.name)
  })

const namedFunctionDeclaration = (
  declaration: ts.FunctionDeclaration
): Option.Option<ts.Identifier> => Option.fromNullable(declaration.name)

const variableStatementFunctions = (
  statement: ts.Statement
): ReadonlyArray<ts.Identifier> =>
  ts.isVariableStatement(statement)
    ? Array.filterMap(statement.declarationList.declarations, declaredFunction)
    : []

const functionDeclarationFunctions = (
  statement: ts.Statement
): ReadonlyArray<ts.Identifier> =>
  Option.liftPredicate(ts.isFunctionDeclaration)(statement).pipe(
    Option.flatMap(namedFunctionDeclaration),
    Option.toArray
  )

const statementFunctions = (
  statement: ts.Statement
): ReadonlyArray<ts.Identifier> => [
  ...variableStatementFunctions(statement),
  ...functionDeclarationFunctions(statement)
]

const topLevelFunctions = (
  sourceFile: ts.SourceFile
): ReadonlyArray<ts.Identifier> =>
  sourceFile.statements.flatMap(statementFunctions)

const declarationsForName = (
  index: FunctionNameIndex,
  name: string
): ReadonlyArray<ts.Identifier> => index.get(name) ?? []

const addFunctionToIndex = (
  index: Map<string, ReadonlyArray<ts.Identifier>>,
  nameNode: ts.Identifier
): Map<string, ReadonlyArray<ts.Identifier>> => {
  const existingDeclarations = declarationsForName(index, nameNode.text)

  return index.set(nameNode.text, [...existingDeclarations, nameNode])
}

const functionsByName = (
  functions: ReadonlyArray<ts.Identifier>
): FunctionNameIndex => {
  const emptyIndex = new Map<string, ReadonlyArray<ts.Identifier>>()

  return functions.reduce(addFunctionToIndex, emptyIndex)
}

const functionNameIndexCache = new WeakMap<ts.Program, FunctionNameIndex>()

const buildFunctionNameIndex = (program: ts.Program): FunctionNameIndex => {
  const projectFunctions = program
    .getSourceFiles()
    .filter(isProjectSourceFile)
    .flatMap(topLevelFunctions)
  const index = functionsByName(projectFunctions)

  functionNameIndexCache.set(program, index)

  return index
}

const functionNameIndex = (program: ts.Program): FunctionNameIndex => {
  const cachedIndex = functionNameIndexCache.get(program)
  const cached = Option.fromNullable(cachedIndex)

  return Option.isSome(cached) ? cached.value : buildFunctionNameIndex(program)
}

const declaredFileName = (nameNode: ts.Identifier): string =>
  nameNode.getSourceFile().fileName

const isOtherFileName =
  (candidateFileName: string) =>
  (fileName: string): boolean =>
    fileName !== candidateFileName

const maxListedFileNames = 3

const formatFileNames = (
  projectRoot: string,
  fileNames: ReadonlyArray<string>
): string => {
  const relativeFileNames = fileNames.map(toRelativeFileName(projectRoot))
  const listedFileNames = relativeFileNames
    .slice(0, maxListedFileNames)
    .join(", ")
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
    const index = functionNameIndex(context.program)
    const declarations = declarationsForName(index, candidate.text)
    const declaredFileNames = declarations.map(declaredFileName)
    const otherFileNames = Array.dedupe(declaredFileNames).filter(
      isOtherFileName(context.sourceFile.fileName)
    )

    if (otherFileNames.length === 0) {
      return Option.none()
    }

    const match = duplicateFunctionMatch(context, candidate, otherFileNames)

    return Option.some(match)
  }

const duplicateFunctionMatches = (
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const fileFunctions = topLevelFunctions(context.sourceFile)

  return Array.filterMap(fileFunctions, candidateRuleMatch(context))
}

const check = onFile(duplicateFunctionMatches)

const badExample1 = new ExampleSnippet({
  filePath: "src/routes/fileA.ts",
  code: `const formatDate = (d: Date): string => d.toISOString()`
})

const badExample2 = new ExampleSnippet({
  filePath: "src/routes/fileB.ts",
  code: `const formatDate = (d: Date): string => d.toISOString()`
})

const goodExample1 = new ExampleSnippet({
  filePath: "src/dateFormat.ts",
  code: `export const formatDate = (d: Date): string => d.toISOString()`
})

const goodExample2 = new ExampleSnippet({
  filePath: "src/routes/fileA.ts",
  code: `import { formatDate } from "../dateFormat.js"`
})

const goodExample3 = new ExampleSnippet({
  filePath: "src/routes/fileB.ts",
  code: `import { formatDate } from "../dateFormat.js"`
})

const example = new RuleExample({
  bad: [badExample1, badExample2],
  good: [goodExample1, goodExample2, goodExample3]
})

export const noDuplicateFunctionNames = new Rule({
  id: ruleId,
  description:
    "Disallow top-level functions that duplicate a function name declared in another file.",
  example,
  check
})
