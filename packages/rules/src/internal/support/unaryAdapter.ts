import { Array, Function, Option, Struct, Tuple, pipe } from "effect"
import * as ts from "typescript"
import type { FunctionDefinition } from "./functionDefinition.js"
import { isFunctionDefinition } from "./isFunctionDefinition.js"
import { singleStatementReturnExpression } from "./singleStatementReturnExpression.js"
import { unwrapTransparentExpression } from "./transparentWrapper.js"
import { strictEqual } from "../equivalence.js"

export const expressionBody = (scan: FunctionDefinition) =>
  pipe(
    Option.liftPredicate(ts.isArrowFunction)(scan),
    Option.flatMap(
      Function.flow(
        Struct.get<ts.ArrowFunction, "body">("body"),
        Option.some,
        Option.filter(ts.isExpression)
      )
    )
  )

export const blockBody = Function.flow(
  Struct.get<FunctionDefinition, "body">("body"),
  Option.fromNullishOr,
  Option.filter(ts.isBlock),
  Option.flatMap(singleStatementReturnExpression)
)

export const hasOneParameter = Function.flow(
  Struct.get<FunctionDefinition, "parameters">("parameters"),
  Array.length,
  strictEqual(1)
)

export const hasNoRestParameter = Function.flow(
  Struct.get<ts.ParameterDeclaration, "dotDotDotToken">("dotDotDotToken"),
  Option.fromNullishOr,
  Option.isNone
)

export const hasNoDefaultValue = Function.flow(
  Struct.get<ts.ParameterDeclaration, "initializer">("initializer"),
  Option.fromNullishOr,
  Option.isNone
)

export const isRequired = Function.flow(
  Struct.get<ts.ParameterDeclaration, "questionToken">("questionToken"),
  Option.fromNullishOr,
  Option.isNone
)

export const isSimpleParameter = (parameter: ts.ParameterDeclaration) => {
  const noRestParameter = hasNoRestParameter(parameter)
  const noDefaultValue = hasNoDefaultValue(parameter)
  const required = isRequired(parameter)
  const identifierName = ts.isIdentifier(parameter.name)
  const conditions = Array.make(noRestParameter, noDefaultValue, required, identifierName)

  return Array.every(conditions, Boolean)
}

export const unaryParameter = (scan: FunctionDefinition) =>
  pipe(
    Option.liftPredicate(hasOneParameter)(scan),
    Option.flatMap(
      Function.flow(Struct.get<FunctionDefinition, "parameters">("parameters"), Array.head)
    ),
    Option.filter(isSimpleParameter)
  )

export const unaryAdapter = (node: ts.Node) =>
  pipe(
    Option.liftPredicate(isFunctionDefinition)(node),
    Option.flatMap((scan) => {
      const parameter = unaryParameter(scan)
      const blockExpression = blockBody(scan)

      const expression = pipe(
        expressionBody(scan),
        Option.orElse(Function.constant(blockExpression)),
        Option.map(unwrapTransparentExpression)
      )

      return Option.gen(function* () {
        const adapterParameter = yield* parameter
        const parameterName = yield* Option.liftPredicate(ts.isIdentifier)(adapterParameter.name)
        const adapterExpression = yield* expression

        return Tuple.make(scan, adapterParameter, parameterName, adapterExpression)
      })
    })
  )
