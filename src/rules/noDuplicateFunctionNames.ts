import { Array, Function, HashMap, Option, pipe } from "effect"
import * as ts from "typescript"
import { onFile } from "./ruleCheck.js"
import { createRuleMatch, toRelativeFileName } from "./ruleMatch.js"
import { functionInitializer, isProjectSourceFile } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-duplicate-function-names"

type FunctionNameIndex = HashMap.HashMap<string, ReadonlyArray<ts.Identifier>>

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

const statementFunctions = (
  statement: ts.Statement
): ReadonlyArray<ts.Identifier> => {
  const variableDeclarationFunctions = ts.isVariableStatement(statement)
    ? Array.filterMap(statement.declarationList.declarations, declaredFunction)
    : []
  const functionDeclarationNames = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(statement),
    Option.flatMap(namedFunctionDeclaration),
    Option.toArray
  )

  return Array.appendAll(variableDeclarationFunctions, functionDeclarationNames)
}

const topLevelFunctions = (
  sourceFile: ts.SourceFile
): ReadonlyArray<ts.Identifier> =>
  sourceFile.statements.flatMap(statementFunctions)

const emptyIdentifierList: Function.LazyArg<ReadonlyArray<ts.Identifier>> =
  Function.constant([])

const declarationsForName =
  (index: FunctionNameIndex) =>
  (name: string): ReadonlyArray<ts.Identifier> =>
    pipe(HashMap.get(index, name), Option.getOrElse(emptyIdentifierList))

const addFunctionToIndex = (
  index: FunctionNameIndex,
  nameNode: ts.Identifier
): FunctionNameIndex => {
  const existingDeclarations = declarationsForName(index)(nameNode.text)
  const nextDeclarations = Array.append(existingDeclarations, nameNode)

  return HashMap.set(index, nameNode.text, nextDeclarations)
}

const functionNameIndexCache = new WeakMap<ts.Program, FunctionNameIndex>()

const orBuildFunctionNameIndex =
  (program: ts.Program) => (): FunctionNameIndex => {
    const projectFunctions = program
      .getSourceFiles()
      .filter(isProjectSourceFile)
      .flatMap(topLevelFunctions)
    const emptyIndex = HashMap.empty<string, ReadonlyArray<ts.Identifier>>()
    const index = projectFunctions.reduce(addFunctionToIndex, emptyIndex)

    functionNameIndexCache.set(program, index)

    return index
  }

const declaredFileName = (nameNode: ts.Identifier): string =>
  nameNode.getSourceFile().fileName

const isOtherFileName =
  (candidateFileName: string) =>
  (fileName: string): boolean =>
    fileName !== candidateFileName

const maxListedFileNames = 3

const candidateRuleMatch =
  (context: RuleContext) =>
  (candidate: ts.Identifier): Option.Option<RuleMatch> => {
    const cached = functionNameIndexCache.get(context.program)
    const index = pipe(
      Option.fromNullable(cached),
      Option.getOrElse(orBuildFunctionNameIndex(context.program))
    )
    const declarations = declarationsForName(index)(candidate.text)
    const declaredFileNames = declarations.map(declaredFileName)
    const otherFileNames = Array.dedupe(declaredFileNames).filter(
      isOtherFileName(context.sourceFile.fileName)
    )

    if (otherFileNames.length === 0) {
      return Option.none()
    }

    const functionName = candidate.text
    const relativeFileNames = otherFileNames.map(
      toRelativeFileName(context.projectRoot)
    )
    const listedFileNames = relativeFileNames
      .slice(0, maxListedFileNames)
      .join(", ")
    const remainingCount = relativeFileNames.length - maxListedFileNames
    const isSingleFile = remainingCount === 1
    const otherFiles =
      remainingCount > 0
        ? `${listedFileNames} and ${isSingleFile ? "1 more file" : `${remainingCount} more files`}`
        : listedFileNames
    const match = createRuleMatch(context)({
      ruleId,
      node: candidate,
      message: `Avoid declaring the top-level function ${functionName} in multiple files.`,
      hint:
        `${functionName} is also declared in ${otherFiles}. Extract one shared implementation ` +
        "into a module scoped to its domain and import it from every file that uses it. Name " +
        "the module after the concept it serves (ts.Node helpers belong in ts-node.ts), not a " +
        "generic lib.ts or utils.ts."
    })

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
  code: `export const formatDate = (d: Date): string => d.toISOString()`
})

const badExample2 = new ExampleSnippet({
  filePath: "src/routes/fileB.ts",
  code: `export const formatDate = (d: Date): string => d.toISOString()`
})

const goodExample1 = new ExampleSnippet({
  filePath: "src/dateFormat.ts",
  code: `export const formatDate = (d: Date): string => d.toISOString()`
})

const goodExample2 = new ExampleSnippet({
  filePath: "src/routes/fileA.ts",
  code: `import { formatDate } from "../dateFormat.js"

export const startedAt = formatDate(new Date())`
})

const goodExample3 = new ExampleSnippet({
  filePath: "src/routes/fileB.ts",
  code: `import { formatDate } from "../dateFormat.js"

export const finishedAt = formatDate(new Date())`
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
