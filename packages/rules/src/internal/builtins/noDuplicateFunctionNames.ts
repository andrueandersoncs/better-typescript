import { Array, Function, HashMap, Result, Schema } from "effect"
import * as ts from "typescript"
import { fileSubscriptions } from "../scanner/fileSubscriptions.js"
import { makeScannerFromSubscriptions } from "../scanner/makeScannerFromSubscriptions.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { isProjectSourceFile } from "../sources/isProjectSourceFile.js"
import type { ProgramContext } from "../sources/data.js"
import { toRelativeFileName } from "../support/paths.js"
import { strictEqual } from "../equivalence.js"
import { topLevelFunctions } from "./topLevelFunctions.js"
import { declarationsForName } from "./declarationsForName.js"

// NoDuplicateFunctionNamesFact exists because its fields form one stable data contract used by the linter.
export const NoDuplicateFunctionNamesFact = Schema.Struct({
  functionName: Schema.String,
  otherFiles: Schema.String
})

export interface NoDuplicateFunctionNamesFact extends Schema.Schema.Type<
  typeof NoDuplicateFunctionNamesFact
> {}

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
        (fileName) => fileName !== context.sourceFile.fileName
      )

      if (strictEqual(0)(otherFileNames.length)) {
        return Result.failVoid
      }

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
        functionName: candidate.text,
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

export const noDuplicateFunctionNamesScanner =
  makeScannerFromSubscriptions(duplicateFunctionNamePlan)
