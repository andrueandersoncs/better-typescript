import { arrowFunctionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { unwrapCarrier } from "../../internal/support/unwrapCarrier.js"
import { foldAst } from "../../internal/sources/foldAst.js"
import { strictEqual } from "../../internal/equivalence.js"

// PreferComposedCallbacksFact exists because its fields form one stable data contract used by the linter.
export const PreferComposedCallbacksFact = Schema.Struct({})

export interface PreferComposedCallbacksFact extends Schema.Schema.Type<
  typeof PreferComposedCallbacksFact
> {}

// emptyPreferComposedCallbacksFact exists because its fields form one stable data contract used by the linter.
export const emptyPreferComposedCallbacksFact = PreferComposedCallbacksFact.make({})

const arrowIsCallArgument = (arrowFunction: ts.ArrowFunction) =>
  ts.isCallExpression(arrowFunction.parent)

const parameterSymbol = (checker: ts.TypeChecker) => (parameter: ts.ParameterDeclaration) => {
  const isIdentifier = ts.isIdentifier(parameter.name)

  if (!isIdentifier) {
    return Option.none()
  }

  const symbol = checker.getSymbolAtLocation(parameter.name)

  return Option.fromNullishOr(symbol)
}

const referencesSymbol = (checker: ts.TypeChecker) => (symbol: ts.Symbol) => {
  const referencesSymbolStep = (referenced: boolean) => (node: ts.Node) => {
    const isIdentifier = ts.isIdentifier(node)
    const notIdentifier = !isIdentifier
    const skipNode = referenced || notIdentifier
    const symbolAtNode = checker.getSymbolAtLocation(node)
    const matchesSymbol = strictEqual(symbol)(symbolAtNode)

    return skipNode ? referenced : matchesSymbol
  }

  const uncurriedReferencesSymbolReducer = Function.untupled(
    ([referenced, node]: readonly [boolean, ts.Node]) => referencesSymbolStep(referenced)(node)
  )

  return Function.flip(foldAst(uncurriedReferencesSymbolReducer))(false)
}

const isDirectForward =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol) =>
  (body: ts.Expression): boolean => {
    const expression = unwrapCarrier(body)
    const callExpression = Option.liftPredicate(ts.isCallExpression)(expression)
    const hasOneArgument = (call: ts.CallExpression) => strictEqual(1)(call.arguments.length)
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

    const matchesTarget = strictEqual(symbol)

    return pipe(onlyArgument, Option.flatMap(symbolAt), Option.exists(matchesTarget))
  }

const hasParameterBearingCall = (checker: ts.TypeChecker) => (symbol: ts.Symbol) => {
  const hasParameterBearingCallReducer = (node: ts.Node) => (found: boolean) => {
    const isCall = ts.isCallExpression(node)
    const notCall = !isCall
    const skipNode = found || notCall
    const argumentReferencesSymbol = referencesSymbol(checker)(symbol)
    const argumentMentionsSymbol = isCall && Array.some(node.arguments, argumentReferencesSymbol)

    return skipNode ? found : argumentMentionsSymbol
  }

  const hasParameterBearingCallFold = Function.untupled(
    ([found, node]: readonly [boolean, ts.Node]) => hasParameterBearingCallReducer(node)(found)
  )

  return Function.flip(foldAst(hasParameterBearingCallFold))(false)
}

const preferComposedCallbacksMatches = (context: MatchContext) => {
  const composedCallbackMatches = (arrowFunction: ts.ArrowFunction) =>
    pipe(
      Option.gen(function* () {
        yield* Option.liftPredicate(arrowIsCallArgument)(arrowFunction)

        const hasOneParameter = strictEqual(1)(arrowFunction.parameters.length)
        yield* Option.liftPredicate((value: boolean) => value)(hasOneParameter)

        const parameter = yield* Option.fromNullishOr(arrowFunction.parameters[0])
        const symbol = yield* parameterSymbol(context.checker)(parameter)
        const body = yield* Option.liftPredicate(ts.isExpression)(arrowFunction.body)
        const directForward = isDirectForward(context.checker)(symbol)(body)
        const parameterBearingCall = hasParameterBearingCall(context.checker)(symbol)(body)

        yield* Option.liftPredicate((value: boolean) => !value)(directForward)
        yield* Option.liftPredicate((value: boolean) => value)(parameterBearingCall)

        return makeNodeMatch(arrowFunction, emptyPreferComposedCallbacksFact)
      }),
      Option.toArray
    )

  return composedCallbackMatches
}

export const preferComposedCallbacksScanner = makeNodeScanner(arrowFunctionKinds)(
  ts.isArrowFunction
)(preferComposedCallbacksMatches)
