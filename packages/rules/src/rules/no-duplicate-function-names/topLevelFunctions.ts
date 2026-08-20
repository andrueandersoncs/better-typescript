import { Array, Function, Option, Result, pipe } from "effect"
import * as ts from "typescript"
import { functionDeclarationName } from "../../internal/support/functionDeclarationName.js"
import { functionInitializer } from "../../internal/support/functionInitializer2.js"

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

export const topLevelFunctions = (sourceFile: ts.SourceFile): ReadonlyArray<ts.Identifier> =>
  Array.flatMap(sourceFile.statements, statementFunctions)
