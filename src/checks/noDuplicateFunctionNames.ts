import { Array, Function, HashMap, Option, pipe } from "effect"
import * as ts from "typescript"
import { fileSubscriptions, withProgramIndex } from "../engine/check.js"
import { functionInitializer } from "./support/tsNode.js"
import { isProjectSourceFile } from "../engine/sources.js"
import { detection, toRelativeFileName } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import type { Check, CheckContext, Subscription } from "../engine/check.js"
import type { Detection } from "../engine/location.js"
import type { ProgramContext } from "../engine/sources.js"
import {
  fixtureRefactorExamples
} from "../engine/example.js"
import type { NonEmptyRefactorExamples } from "../engine/example.js"

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

// Compare mutual assignability because parameter renames preserve a copied signature while different domain data does not.
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

type IdenticalSignature = (
  candidate: ts.Identifier
) => (other: ts.Identifier) => boolean
type RelativeFileName = (fileName: string) => string

const candidateDetection =
  (index: FunctionNameIndex) =>
  (identicalTo: IdenticalSignature) =>
  (toRelative: RelativeFileName) =>
  (match: MakeDetection) =>
  (candidateFileName: string) =>
  (candidate: ts.Identifier): Option.Option<Detection> => {
    const declarations = declarationsForName(index)(candidate.text)
    const identicalDeclarations = declarations.filter(identicalTo(candidate))
    const declaredFileNames = identicalDeclarations.map(declaredFileName)
    const otherFileNames = Array.dedupe(declaredFileNames).filter(
      isOtherFileName(candidateFileName)
    )

    if (otherFileNames.length === 0) {
      return Option.none()
    }

    const functionName = candidate.text
    const relativeFileNames = otherFileNames.map(toRelative)
    const listedFileNames = relativeFileNames
      .slice(0, maxListedFileNames)
      .join(", ")
    const remainingCount = relativeFileNames.length - maxListedFileNames
    const isSingleFile = remainingCount === 1
    const otherFiles =
      remainingCount > 0
        ? `${listedFileNames} and ${isSingleFile ? "1 more file" : `${remainingCount} more files`}`
        : listedFileNames
    const duplicateMatch = match({
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

    return Option.some(duplicateMatch)
  }

const duplicateFunctionMatches =
  (index: FunctionNameIndex) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    const fileFunctions = topLevelFunctions(context.sourceFile)
    const identicalTo = hasIdenticalSignature(context.checker)
    const toRelative = toRelativeFileName(context.projectRoot)
    const match = detection(context)
    const candidateMatch = candidateDetection(index)(identicalTo)(toRelative)(
      match
    )(context.sourceFile.fileName)

    return Array.filterMap(fileFunctions, candidateMatch)
  }

const buildFunctionNameIndex = (context: ProgramContext): FunctionNameIndex => {
  const projectFunctions = context.program
    .getSourceFiles()
    .filter(isProjectSourceFile)
    .flatMap(topLevelFunctions)
  const emptyIndex = HashMap.empty<string, ReadonlyArray<ts.Identifier>>()

  return projectFunctions.reduce(addFunctionToIndex, emptyIndex)
}

const duplicateNameListeners = (
  index: FunctionNameIndex
): ReadonlyArray<Subscription> =>
  fileSubscriptions(duplicateFunctionMatches(index))

const check = withProgramIndex(buildFunctionNameIndex)(duplicateNameListeners)

export const noDuplicateFunctionNames: Check = check

export const noDuplicateFunctionNamesExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-duplicate-function-names")
