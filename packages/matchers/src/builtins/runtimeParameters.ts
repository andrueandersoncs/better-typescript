import { Array, Option, pipe } from "effect"
import type * as ts from "typescript"
import type { FunctionDefinition } from "../support/functionDefinition.js"
import { isFunctionDefinition } from "../support/isFunctionDefinition.js"

export const isRuntimeParameter = (parameter: ts.ParameterDeclaration) => {
  const sourceFile = parameter.getSourceFile()
  const parameterName = parameter.name.getText(sourceFile)

  return parameterName !== "this"
}

export const runtimeParameters = (declaration: ts.Node): ReadonlyArray<ts.ParameterDeclaration> => {
  const runtimeParametersOf = (functionDefinition: FunctionDefinition) =>
    Array.filter(functionDefinition.parameters, isRuntimeParameter)

  return pipe(
    Option.liftPredicate(isFunctionDefinition)(declaration),
    Option.map(runtimeParametersOf),
    Option.getOrElse(Array.empty)
  )
}
