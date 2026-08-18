import { Array, Function, Option, Result, Struct, pipe } from "effect"
import { strictEqual } from "../equivalence.js"
import * as ts from "typescript"
import type { CallLikeExpression } from "../support/callLikeExpression.js"
import { unwrapExpression } from "../support/unwrapExpression.js"
import { invocationExpressionBody } from "./invocationExpressionBody.js"

const parameterIdentifiers = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
): Option.Option<ReadonlyArray<ts.Identifier>> => {
  const identifiers = Array.filterMap(node.parameters, (parameter) => {
    const initializer = Option.fromNullishOr(parameter.initializer)
    const restToken = Option.fromNullishOr(parameter.dotDotDotToken)
    const initializerMissing = Option.isNone(initializer)
    const restTokenMissing = Option.isNone(restToken)
    const omissions = Array.make(initializerMissing, restTokenMissing)
    const unmodified = Array.every(omissions, Boolean)
    const identifier = pipe(Option.some(parameter.name), Option.filter(ts.isIdentifier))

    return pipe(
      identifier,
      Option.filter(Function.constant(unmodified)),
      Result.fromOption(Function.constVoid)
    )
  })

  return strictEqual(node.parameters.length)(identifiers.length)
    ? Option.some(identifiers)
    : Option.none()
}

const propertyForwardingName = (property: ts.ObjectLiteralElementLike) => {
  const shorthandName = pipe(
    Option.liftPredicate(ts.isShorthandPropertyAssignment)(property),
    Option.map(Struct.get("name")),
    Option.map(Struct.get("text"))
  )

  const assignmentName = pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(property),
    Option.map(Struct.get("initializer")),
    Option.map(unwrapExpression),
    Option.filter(ts.isIdentifier),
    Option.map(Struct.get("text"))
  )

  return pipe(
    shorthandName,
    Option.orElse(Function.constant(assignmentName)),
    Result.fromOption(Function.constVoid)
  )
}

const forwardedArgumentNames = (
  argument: ts.Expression
): Result.Result<ReadonlyArray<string>, void> => {
  const expression = unwrapExpression(argument)

  const identifierNames = pipe(
    Option.liftPredicate(ts.isIdentifier)(expression),
    Option.map(Struct.get("text")),
    Option.map(Array.of)
  )

  const objectNames = pipe(
    Option.liftPredicate(ts.isObjectLiteralExpression)(expression),
    Option.flatMap((objectLiteral) => {
      const names = Array.filterMap(objectLiteral.properties, propertyForwardingName)
      const everyPropertyForwards = strictEqual(objectLiteral.properties.length)(names.length)

      return everyPropertyForwards ? Option.some(names) : Option.none()
    })
  )

  return pipe(
    identifierNames,
    Option.orElse(Function.constant(objectNames)),
    Result.fromOption(Function.constVoid)
  )
}

const invocationArgumentNames = (
  invocation: CallLikeExpression
): Option.Option<ReadonlyArray<string>> => {
  const argumentsList = invocation.arguments ?? Array.empty<ts.Expression>()
  const namesByArgument = Array.filterMap(argumentsList, forwardedArgumentNames)
  const everyArgumentForwards = strictEqual(argumentsList.length)(namesByArgument.length)
  const names = Array.flatten(namesByArgument)

  return everyArgumentForwards ? Option.some(names) : Option.none()
}

const forwardingRootIdentifier = (expression: ts.Expression): Option.Option<ts.Identifier> => {
  const unwrapped = unwrapExpression(expression)
  const identifier = Option.liftPredicate(ts.isIdentifier)(unwrapped)

  const propertyRoot = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
    Option.map(Struct.get("expression")),
    Option.flatMap(forwardingRootIdentifier)
  )

  const elementRoot = pipe(
    Option.liftPredicate(ts.isElementAccessExpression)(unwrapped),
    Option.map(Struct.get("expression")),
    Option.flatMap(forwardingRootIdentifier)
  )

  return pipe(
    identifier,
    Option.orElse(Function.constant(propertyRoot)),
    Option.orElse(Function.constant(elementRoot))
  )
}

const consumedParameterNames =
  (parameters: ReadonlyArray<ts.Identifier>) =>
  (invocation: CallLikeExpression): Option.Option<ReadonlyArray<string>> => {
    const parameterNames = Array.map(parameters, Struct.get("text"))
    const isParameterName = (name: string) => Array.contains(parameterNames, name)
    const argumentNames = invocationArgumentNames(invocation)

    const receiverName = pipe(
      forwardingRootIdentifier(invocation.expression),
      Option.map(Struct.get("text")),
      Option.filter(isParameterName),
      Option.toArray
    )

    const appendReceiverName = (names: ReadonlyArray<string>) =>
      Array.appendAll(receiverName, names)

    return pipe(argumentNames, Option.map(appendReceiverName))
  }

const exactPositionalForwarder = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
) =>
  Option.gen(function* () {
    const invocation = yield* invocationExpressionBody(node)

    const argumentsList = pipe(
      Option.fromNullishOr(invocation.arguments),
      Option.map(Array.fromIterable),
      Option.getOrElse(Array.empty<ts.Expression>)
    )

    yield* pipe(argumentsList.length, Option.liftPredicate(strictEqual(node.parameters.length)))

    const parameterMatchesArgument = (parameter: ts.ParameterDeclaration, index: number) => {
      const argument = Array.get(argumentsList, index)
      const parameterName = pipe(Option.some(parameter.name), Option.filter(ts.isIdentifier))
      const hasNoInitializer = pipe(parameter.initializer, Option.fromNullishOr, Option.isNone)

      const argumentName = pipe(
        argument,
        Option.map(unwrapExpression),
        Option.flatMap((expression) => {
          const direct = pipe(Option.some(expression), Option.filter(ts.isIdentifier))

          const spread = pipe(
            Option.liftPredicate(ts.isSpreadElement)(expression),
            Option.map(Struct.get("expression")),
            Option.map(unwrapExpression),
            Option.filter(ts.isIdentifier)
          )

          const isRest = pipe(parameter.dotDotDotToken, Option.fromNullishOr, Option.isSome)

          return isRest ? spread : direct
        })
      )

      const sameName = pipe(
        Option.all({ argumentName, parameterName }),
        Option.exists(({ argumentName, parameterName }) =>
          strictEqual(parameterName.text)(argumentName.text)
        )
      )

      return hasNoInitializer && sameName
    }

    return Array.every(node.parameters, parameterMatchesArgument)
  })

export const isExactForwarder = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
) => {
  const consumedByParameters = (parameters: ReadonlyArray<ts.Identifier>) => {
    const namesConsumedBy = consumedParameterNames(parameters)

    const matchesForwardingShape = (consumedNames: ReadonlyArray<string>) => {
      const parameterNames = Array.map(parameters, Struct.get("text"))

      return Array.match(consumedNames, {
        onEmpty: () => strictEqual(0)(parameterNames.length),
        onNonEmpty: () => {
          const sameOrder = Array.every(parameterNames, (name, index) => {
            const candidate = Array.get(consumedNames, index)

            return Option.contains(candidate, name)
          })

          const sameLength = strictEqual(parameterNames.length)(consumedNames.length)

          return sameOrder && sameLength
        }
      })
    }

    return pipe(
      invocationExpressionBody(node),
      Option.flatMap(namesConsumedBy),
      Option.map(matchesForwardingShape)
    )
  }

  const structuralForwarder = pipe(
    parameterIdentifiers(node),
    Option.flatMap(consumedByParameters),
    Option.getOrElse(Function.constant(false))
  )

  const positionalForwarder = pipe(
    exactPositionalForwarder(node),
    Option.getOrElse(Function.constant(false))
  )

  return structuralForwarder || positionalForwarder
}
