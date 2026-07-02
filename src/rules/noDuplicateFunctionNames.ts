import { Array, Function, HashMap, Option, pipe } from "effect"
import * as ts from "typescript"
import { fileListeners, withProgramIndex } from "./ruleCheck.js"
import { createRuleMatch, toRelativeFileName } from "./ruleMatch.js"
import { functionInitializer, isProjectSourceFile } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type {
  ProgramContext,
  RuleContext,
  RuleListener,
  RuleMatch
} from "./types.js"

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

const declaredFileName = (nameNode: ts.Identifier): string =>
  nameNode.getSourceFile().fileName

const isOtherFileName =
  (candidateFileName: string) =>
  (fileName: string): boolean =>
    fileName !== candidateFileName

// Mutual assignability is signature equality up to parameter names: a renamed copy-paste still matches, while a same-name function over different data (user.ts#make vs account.ts#make) does not.
const hasIdenticalSignature =
  (checker: ts.TypeChecker) =>
  (candidate: ts.Identifier) =>
  (other: ts.Identifier): boolean => {
    const candidateType = checker.getTypeAtLocation(candidate)
    const otherType = checker.getTypeAtLocation(other)
    const forward = checker.isTypeAssignableTo(candidateType, otherType)
    const backward = checker.isTypeAssignableTo(otherType, candidateType)

    return [forward, backward].every(Boolean)
  }

const maxListedFileNames = 3

const candidateRuleMatch =
  (index: FunctionNameIndex) =>
  (context: RuleContext) =>
  (candidate: ts.Identifier): Option.Option<RuleMatch> => {
    const declarations = declarationsForName(index)(candidate.text)
    const identicalDeclarations = declarations.filter(
      hasIdenticalSignature(context.checker)(candidate)
    )
    const declaredFileNames = identicalDeclarations.map(declaredFileName)
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
      message: `Avoid declaring the top-level function ${functionName} with an identical signature in multiple files.`,
      hint:
        `${functionName} is declared with the same signature in ${otherFiles}, which makes ` +
        "the copies semantic duplicates. Extract one shared implementation into a module " +
        "scoped to its domain and import it from every file that uses it. Name the module " +
        "after the concept it serves (ts.Node helpers belong in ts-node.ts), not a generic " +
        "lib.ts or utils.ts. Same-name functions over different signatures (user.ts#make, " +
        "account.ts#make) are module vocabulary, not duplicates."
    })

    return Option.some(match)
  }

const duplicateFunctionMatches =
  (index: FunctionNameIndex) =>
  (context: RuleContext): ReadonlyArray<RuleMatch> => {
    const fileFunctions = topLevelFunctions(context.sourceFile)

    return Array.filterMap(fileFunctions, candidateRuleMatch(index)(context))
  }

const buildFunctionNameIndex = (
  context: ProgramContext
): FunctionNameIndex => {
  const projectFunctions = context.program
    .getSourceFiles()
    .filter(isProjectSourceFile)
    .flatMap(topLevelFunctions)
  const emptyIndex = HashMap.empty<string, ReadonlyArray<ts.Identifier>>()

  return projectFunctions.reduce(addFunctionToIndex, emptyIndex)
}

const duplicateNameListeners = (
  index: FunctionNameIndex
): ReadonlyArray<RuleListener> => fileListeners(duplicateFunctionMatches(index))

const check = withProgramIndex(buildFunctionNameIndex)(duplicateNameListeners)

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

const startTime = new Date()

export const startedAt = formatDate(startTime)`
})

const goodExample3 = new ExampleSnippet({
  filePath: "src/routes/fileB.ts",
  code: `import { formatDate } from "../dateFormat.js"

const finishTime = new Date()

export const finishedAt = formatDate(finishTime)`
})

const goodVocabularyUser = new ExampleSnippet({
  filePath: "src/modules/user.ts",
  code: `import { Schema } from "effect"

export class User extends Schema.Class<User>("User")({
  name: Schema.String
}) {}

export const make = (name: string): User => new User({ name })`
})

const goodVocabularyAccount = new ExampleSnippet({
  filePath: "src/modules/account.ts",
  code: `import { Schema } from "effect"

export class Account extends Schema.Class<Account>("Account")({
  id: Schema.Number
}) {}

export const make = (id: number): Account => new Account({ id })`
})

const example = new RuleExample({
  bad: [badExample1, badExample2],
  good: [
    goodExample1,
    goodExample2,
    goodExample3,
    goodVocabularyUser,
    goodVocabularyAccount
  ]
})

export const noDuplicateFunctionNames = new Rule({
  id: ruleId,
  description:
    "Disallow top-level functions that duplicate both the name and the signature of a " +
    "function declared in another file; same-name functions over different signatures " +
    "(each data module's make, get, ...) are module vocabulary, not duplicates.",
  example,
  check
})
