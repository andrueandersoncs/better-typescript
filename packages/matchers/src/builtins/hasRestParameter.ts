import { Array, Option, pipe } from "effect"
import type * as ts from "typescript"
import type { FunctionDefinition } from "../support/functionDefinition.js"
import { isFunctionDefinition } from "../support/isFunctionDefinition.js"

const parameterHasRestToken = (parameter: ts.ParameterDeclaration) =>
  pipe(Option.fromNullishOr(parameter.dotDotDotToken), Option.isSome)

export const hasRestParameter = (declaration: ts.Node) => {
  const definitionHasRestParameter = (functionDefinition: FunctionDefinition) =>
    Array.some(functionDefinition.parameters, parameterHasRestToken)

  return pipe(
    Option.liftPredicate(isFunctionDefinition)(declaration),
    Option.exists(definitionHasRestParameter)
  )
}
