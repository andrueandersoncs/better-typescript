import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapCarrier } from "./support/tsNode.js"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const message = "Avoid inline callbacks that compose the callback parameter through calls."

const hint =
  "Use flow or pipe when the parameter moves through a composition. When no combinator expresses " +
  "the transformation, name the adapter in the nearest scope and pass it by reference."

const arrowIsCallArgument = (arrowFunction: ts.ArrowFunction) =>
  ts.isCallExpression(arrowFunction.parent)

const parameterSymbol = (checker: ts.TypeChecker) => (parameter: ts.ParameterDeclaration) => {
  const parameterName = parameter.name
  const isIdentifier = ts.isIdentifier(parameterName)

  if (!isIdentifier) {
    return Option.none()
  }

  const symbol = checker.getSymbolAtLocation(parameterName)

  return Option.fromNullishOr(symbol)
}

const referencesSymbol = (checker: ts.TypeChecker) => (symbol: ts.Symbol) =>
  Function.flip(
    foldAst((referenced: boolean, node: ts.Node): boolean => {
      const isIdentifier = ts.isIdentifier(node)
      const notIdentifier = !isIdentifier
      const skipNode = referenced || notIdentifier
      const symbolAtNode = checker.getSymbolAtLocation(node)
      const matchesSymbol = strictEqual(symbolAtNode, symbol)

      return skipNode ? referenced : matchesSymbol
    })
  )(false)

const isDirectForward =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol) =>
  (body: ts.Expression): boolean => {
    const expression = unwrapCarrier(body)
    const callExpression = Option.liftPredicate(ts.isCallExpression)(expression)
    const hasOneArgument = (call: ts.CallExpression) => strictEqual(call.arguments.length, 1)
    const singleArgumentCall = pipe(callExpression, Option.filter(hasOneArgument))
    const firstArgument = (call: ts.CallExpression) => Option.fromNullishOr(call.arguments[0])

    const onlyArgument = pipe(
      singleArgumentCall,
      Option.flatMap(firstArgument),
      Option.map(unwrapCarrier),
      Option.filter(ts.isIdentifier)
    )

    const symbolAt = (identifier: ts.Identifier) =>
      pipe(checker.getSymbolAtLocation(identifier), Option.fromNullishOr)

    const matchesTarget = (current: ts.Symbol) => strictEqual(current, symbol)

    return pipe(onlyArgument, Option.flatMap(symbolAt), Option.exists(matchesTarget))
  }

const hasParameterBearingCall = (checker: ts.TypeChecker) => (symbol: ts.Symbol) =>
  Function.flip(
    foldAst((found: boolean, node: ts.Node): boolean => {
      const isCall = ts.isCallExpression(node)
      const notCall = !isCall
      const skipNode = found || notCall
      const argumentReferencesSymbol = referencesSymbol(checker)(symbol)
      const argumentMentionsSymbol = isCall && Array.some(node.arguments, argumentReferencesSymbol)

      return skipNode ? found : argumentMentionsSymbol
    })
  )(false)

const composedCallbackMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = makeDetection(context)

  const matches = (arrowFunction: ts.ArrowFunction): ReadonlyArray<Detection> =>
    pipe(
      Option.gen(function* () {
        yield* Option.liftPredicate(arrowIsCallArgument)(arrowFunction)

        const hasOneParameter = strictEqual(arrowFunction.parameters.length, 1)
        yield* Option.liftPredicate((value: boolean) => value)(hasOneParameter)

        const parameter = yield* Option.fromNullishOr(arrowFunction.parameters[0])
        const symbol = yield* parameterSymbol(checker)(parameter)
        const body = yield* Option.liftPredicate(ts.isExpression)(arrowFunction.body)
        const directForward = isDirectForward(checker)(symbol)(body)
        const parameterBearingCall = hasParameterBearingCall(checker)(symbol)(body)

        yield* Option.liftPredicate((value: boolean) => !value)(directForward)
        yield* Option.liftPredicate((value: boolean) => value)(parameterBearingCall)

        return match({ node: arrowFunction, message, hint })
      }),
      Option.toArray
    )

  return matches
}

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

export const preferComposedCallbacks = makeCheck(
  "prefer-composed-callbacks",
  arrowFunctionKinds,
  ts.isArrowFunction,
  composedCallbackMatches
)
