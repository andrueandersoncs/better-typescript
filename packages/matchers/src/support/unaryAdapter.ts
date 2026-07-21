import { Array, Function, Option, Struct, Tuple, pipe } from "effect"
import * as ts from "typescript"
import {
  isFunctionDefinition,
  singleStatementReturnExpression,
  unwrapTransparentExpression,
  type FunctionDefinition
} from "./tsNode.js"
import { strictEqual } from "../equivalence.js"

const expressionBody = (definition: FunctionDefinition) =>
  pipe(
    Option.liftPredicate(ts.isArrowFunction)(definition),
    Option.flatMap(
      Function.flow(
        Struct.get<ts.ArrowFunction, "body">("body"),
        Option.some,
        Option.filter(ts.isExpression)
      )
    )
  )

const blockBody = Function.flow(
  Struct.get<FunctionDefinition, "body">("body"),
  Option.fromNullishOr,
  Option.filter(ts.isBlock),
  Option.flatMap(singleStatementReturnExpression)
)

const hasOneParameter = Function.flow(
  Struct.get<FunctionDefinition, "parameters">("parameters"),
  Array.length,
  strictEqual(1)
)

const hasNoRestParameter = Function.flow(
  Struct.get<ts.ParameterDeclaration, "dotDotDotToken">("dotDotDotToken"),
  Option.fromNullishOr,
  Option.isNone
)

const hasNoDefaultValue = Function.flow(
  Struct.get<ts.ParameterDeclaration, "initializer">("initializer"),
  Option.fromNullishOr,
  Option.isNone
)

const isRequired = Function.flow(
  Struct.get<ts.ParameterDeclaration, "questionToken">("questionToken"),
  Option.fromNullishOr,
  Option.isNone
)

const isSimpleParameter = (parameter: ts.ParameterDeclaration) => {
  const noRestParameter = hasNoRestParameter(parameter)
  const noDefaultValue = hasNoDefaultValue(parameter)
  const required = isRequired(parameter)
  const identifierName = ts.isIdentifier(parameter.name)
  const conditions = Array.make(noRestParameter, noDefaultValue, required, identifierName)

  return Array.every(conditions, Boolean)
}

const unaryParameter = (definition: FunctionDefinition) =>
  pipe(
    Option.liftPredicate(hasOneParameter)(definition),
    Option.flatMap(
      Function.flow(Struct.get<FunctionDefinition, "parameters">("parameters"), Array.head)
    ),
    Option.filter(isSimpleParameter)
  )

export const unaryAdapter = (node: ts.Node) =>
  pipe(
    Option.liftPredicate(isFunctionDefinition)(node),
    Option.flatMap((definition) => {
      const parameter = unaryParameter(definition)
      const blockExpression = blockBody(definition)

      const expression = pipe(
        expressionBody(definition),
        Option.orElse(Function.constant(blockExpression)),
        Option.map(unwrapTransparentExpression)
      )

      return Option.gen(function* () {
        const adapterParameter = yield* parameter
        const parameterName = yield* Option.liftPredicate(ts.isIdentifier)(adapterParameter.name)
        const adapterExpression = yield* expression

        return Tuple.make(definition, adapterParameter, parameterName, adapterExpression)
      })
    })
  )
