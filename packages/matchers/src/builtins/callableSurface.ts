import { Array, Option } from "effect"
import type * as ts from "typescript"
import { InterfaceBurdenData } from "./interfaceBurdenData.js"

const requiredParameters = (parameters: ts.NodeArray<ts.ParameterDeclaration>) =>
  Array.countBy(parameters, (parameter) => {
    const optional = Option.fromNullishOr(parameter.questionToken)
    const defaulted = Option.fromNullishOr(parameter.initializer)
    const rest = Option.fromNullishOr(parameter.dotDotDotToken)
    const optionalMissing = Option.isNone(optional)
    const defaultMissing = Option.isNone(defaulted)
    const restMissing = Option.isNone(rest)
    const omissions = Array.make(optionalMissing, defaultMissing, restMissing)

    return Array.every(omissions, Boolean)
  })

export const callableSurface = (
  node:
    | ts.ArrowFunction
    | ts.FunctionExpression
    | ts.FunctionDeclaration
    | ts.MethodDeclaration
    | ts.GetAccessorDeclaration
    | ts.SetAccessorDeclaration
    | ts.ConstructorDeclaration
) => {
  const requiredParameterCount = requiredParameters(node.parameters)

  return InterfaceBurdenData.make({
    operationCount: 1,
    requiredParameterCount
  })
}
