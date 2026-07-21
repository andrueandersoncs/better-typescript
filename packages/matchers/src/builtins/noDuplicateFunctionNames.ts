import { Array, Function, HashMap, Option, pipe, Result, Schema } from "effect"
import * as ts from "typescript"
import { makeMatcherFromSubscriptions, fileSubscriptions } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { functionDeclarationName, functionInitializer } from "../support/tsNode.js"
import { isProjectSourceFile } from "../sources/sources.js"
import type { ProgramContext } from "../sources/data.js"
import { toRelativeFileName } from "../support/paths.js"
import { strictEqual } from "../equivalence.js"

// NoDuplicateFunctionNamesFact is duplicate-name evidence because guidance cites both sides.
export const NoDuplicateFunctionNamesFact = Schema.Struct({
  functionName: Schema.String,
  otherFiles: Schema.String
})

export interface NoDuplicateFunctionNamesFact extends Schema.Schema.Type<
  typeof NoDuplicateFunctionNamesFact
> {}

const functionNameFromVariableDeclaration = (declaration: ts.VariableDeclaration) =>
  Option.gen(function* () {
    yield* functionInitializer(declaration)

    return yield* Option.liftPredicate(ts.isIdentifier)(declaration.name)
  })

const statementFunctions = (statement: ts.Statement): ReadonlyArray<ts.Identifier> => {
  const variableDeclarationFunctions = ts.isVariableStatement(statement)
    ? Array.filterMap(
        statement.declarationList.declarations,
        Function.flow(functionNameFromVariableDeclaration, Result.fromOption(Function.constVoid))
      )
    : Array.empty()

  const functionDeclarationNames = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(statement),
    Option.flatMap(functionDeclarationName),
    Option.toArray
  )

  return Array.appendAll(variableDeclarationFunctions, functionDeclarationNames)
}

const topLevelFunctions = (sourceFile: ts.SourceFile): ReadonlyArray<ts.Identifier> =>
  Array.flatMap(sourceFile.statements, statementFunctions)

const emptyIdentifiers = Array.empty()

const emptyIdentifierList: Function.LazyArg<ReadonlyArray<ts.Identifier>> =
  Function.constant(emptyIdentifiers)

const declarationsForName =
  (index: HashMap.HashMap<string, ReadonlyArray<ts.Identifier>>) =>
  (name: string): ReadonlyArray<ts.Identifier> =>
    pipe(HashMap.get(index, name), Option.getOrElse(emptyIdentifierList))

const addFunctionToIndex = (
  index: HashMap.HashMap<string, ReadonlyArray<ts.Identifier>>,
  nameNode: ts.Identifier
): HashMap.HashMap<string, ReadonlyArray<ts.Identifier>> => {
  const existingDeclarations = declarationsForName(index)(nameNode.text)
  const nextDeclarations = Array.append(existingDeclarations, nameNode)

  return HashMap.set(index, nameNode.text, nextDeclarations)
}

const declaredFileName = (nameNode: ts.Identifier) => nameNode.getSourceFile().fileName

const maxListedFileNames = 3

const buildFunctionNameIndex = (
  context: ProgramContext
): HashMap.HashMap<string, ReadonlyArray<ts.Identifier>> => {
  const programSourceFiles = context.program.getSourceFiles()
  const filtered = Array.filter(programSourceFiles, isProjectSourceFile)
  const projectFunctions = Array.flatMap(filtered, topLevelFunctions)
  const emptyIndex = HashMap.empty<string, ReadonlyArray<ts.Identifier>>()

  return Array.reduce(projectFunctions, emptyIndex, addFunctionToIndex)
}

const duplicateNameListeners = (index: HashMap.HashMap<string, ReadonlyArray<ts.Identifier>>) => {
  const matchDuplicateName = (context: MatchContext) => {
    const fileFunctions = topLevelFunctions(context.sourceFile)
    const toRelative = toRelativeFileName(context.projectRoot)
    const candidateFileName = context.sourceFile.fileName

    const matchCandidate = (candidate: ts.Identifier) => {
      const declarations = declarationsForName(index)(candidate.text)

      // Compare mutual assignability because renamed params keep a copied signature.
      const identicalDeclarations = Array.filter(declarations, (other) => {
        const candidateType = context.checker.getTypeAtLocation(candidate)
        const otherType = context.checker.getTypeAtLocation(other)
        const forward = context.checker.isTypeAssignableTo(candidateType, otherType)
        const backward = context.checker.isTypeAssignableTo(otherType, candidateType)
        const ambientConditions = Array.make(forward, backward)
        return Array.every(ambientConditions, Boolean)
      })

      const declaredFileNames = Array.map(identicalDeclarations, declaredFileName)
      const uniqueFileNames = Array.dedupe(declaredFileNames)

      const otherFileNames = Array.filter(
        uniqueFileNames,
        (fileName) => fileName !== candidateFileName
      )

      if (strictEqual(0)(otherFileNames.length)) {
        return Result.failVoid
      }

      const functionName = candidate.text
      const relativeFileNames = Array.map(otherFileNames, toRelative)
      const taken = Array.take(relativeFileNames, maxListedFileNames)
      const listedFileNames = Array.join(taken, ", ")
      const remainingCount = relativeFileNames.length - maxListedFileNames
      const isSingleFile = strictEqual(1)(remainingCount)

      const otherFiles =
        remainingCount > 0
          ? `${listedFileNames} and ${isSingleFile ? "1 more file" : `${remainingCount} more files`}`
          : listedFileNames

      const fact = NoDuplicateFunctionNamesFact.make({
        functionName,
        otherFiles
      })

      const match = makeNodeMatch(candidate, fact)

      return Result.succeed(match)
    }

    return Array.filterMap(fileFunctions, matchCandidate)
  }

  return fileSubscriptions(matchDuplicateName)
}

const duplicateFunctionNamePlan = Function.compose(buildFunctionNameIndex, duplicateNameListeners)

export const noDuplicateFunctionNamesMatcher =
  makeMatcherFromSubscriptions(duplicateFunctionNamePlan)
