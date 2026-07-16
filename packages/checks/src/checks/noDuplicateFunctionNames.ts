import { Array, Function, HashMap, Option, pipe, Result } from "effect"
import * as ts from "typescript"
import { functionInitializer } from "./support/tsNode.js"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import type { CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

import { definePlannedCheck } from "../defineCheck.js"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { fileSubscriptions, detection } from "@better-typescript/core/engine/check"

const declaredFunction = (declaration: ts.VariableDeclaration): Option.Option<ts.Identifier> =>
  Option.gen(function* () {
    yield* functionInitializer(declaration)

    return yield* Option.liftPredicate(ts.isIdentifier)(declaration.name)
  })

const namedFunctionDeclaration = (
  declaration: ts.FunctionDeclaration
): Option.Option<ts.Identifier> => Option.fromNullishOr(declaration.name)

const statementFunctions = (statement: ts.Statement): ReadonlyArray<ts.Identifier> => {
  const variableDeclarationFunctions = ts.isVariableStatement(statement)
    ? Array.filterMap(
        statement.declarationList.declarations,
        Function.flow(declaredFunction, Result.fromOption(Function.constVoid))
      )
    : Array.empty()

  const functionDeclarationNames = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(statement),
    Option.flatMap(namedFunctionDeclaration),
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

const declaredFileName = (nameNode: ts.Identifier): string => nameNode.getSourceFile().fileName

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

const duplicateNameListeners = (
  index: HashMap.HashMap<string, ReadonlyArray<ts.Identifier>>
): ReadonlyArray<Subscription> =>
  fileSubscriptions((context: CheckContext): ReadonlyArray<Detection> => {
    const fileFunctions = topLevelFunctions(context.sourceFile)
    const toRelative = toRelativeFileName(context.projectRoot)
    const match = detection(context)
    const candidateFileName = context.sourceFile.fileName

    return Array.filterMap(fileFunctions, (candidate) => {
      const declarations = declarationsForName(index)(candidate.text)

      // Compare mutual assignability because renamed params keep a copied signature; domains may differ.
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

      if (otherFileNames.length === 0) {
        return Result.failVoid
      }

      const functionName = candidate.text
      const relativeFileNames = Array.map(otherFileNames, toRelative)
      const taken = Array.take(relativeFileNames, maxListedFileNames)
      const listedFileNames = Array.join(taken, ", ")
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

      return Result.succeed(duplicateMatch)
    })
  })

const duplicateFunctionNamePlan = Function.compose(buildFunctionNameIndex, duplicateNameListeners)

export const noDuplicateFunctionNames = definePlannedCheck(
  "no-duplicate-function-names",
  duplicateFunctionNamePlan
)
