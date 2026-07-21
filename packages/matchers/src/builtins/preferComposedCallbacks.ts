import { Array, Function, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { unwrapCarrier } from "../support/tsNode.js"
import { foldAst } from "../sources/sources.js"
import { strictEqual } from "../equivalence.js"

// PreferComposedCallbacksFact is empty payload because guidance and matchers share identity.
export const PreferComposedCallbacksFact = Schema.Struct({})

export interface PreferComposedCallbacksFact extends Schema.Schema.Type<
  typeof PreferComposedCallbacksFact
> {}

// emptyPreferComposedCallbacksFact is empty payload because guidance and matchers share identity.
export const emptyPreferComposedCallbacksFact = PreferComposedCallbacksFact.make({})

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

const referencesSymbol = (checker: ts.TypeChecker) => (symbol: ts.Symbol) => {
  const referencesSymbolReducer = (referenced: boolean, node: ts.Node) => {
    const isIdentifier = ts.isIdentifier(node)
    const notIdentifier = !isIdentifier
    const skipNode = referenced || notIdentifier
    const symbolAtNode = checker.getSymbolAtLocation(node)
    const matchesSymbol = strictEqual(symbol)(symbolAtNode)

    return skipNode ? referenced : matchesSymbol
  }

  return Function.flip(foldAst(referencesSymbolReducer))(false)
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
  const hasParameterBearingCallReducer = (found: boolean, node: ts.Node) => {
    const isCall = ts.isCallExpression(node)
    const notCall = !isCall
    const skipNode = found || notCall
    const argumentReferencesSymbol = referencesSymbol(checker)(symbol)
    const argumentMentionsSymbol = isCall && Array.some(node.arguments, argumentReferencesSymbol)

    return skipNode ? found : argumentMentionsSymbol
  }

  return Function.flip(foldAst(hasParameterBearingCallReducer))(false)
}

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

const preferComposedCallbacksMatches = (context: MatchContext) => {
  const checker = context.checker

  const composedCallbackMatches = (arrowFunction: ts.ArrowFunction) =>
    pipe(
      Option.gen(function* () {
        yield* Option.liftPredicate(arrowIsCallArgument)(arrowFunction)

        const hasOneParameter = strictEqual(1)(arrowFunction.parameters.length)
        yield* Option.liftPredicate((value: boolean) => value)(hasOneParameter)

        const parameter = yield* Option.fromNullishOr(arrowFunction.parameters[0])
        const symbol = yield* parameterSymbol(checker)(parameter)
        const body = yield* Option.liftPredicate(ts.isExpression)(arrowFunction.body)
        const directForward = isDirectForward(checker)(symbol)(body)
        const parameterBearingCall = hasParameterBearingCall(checker)(symbol)(body)

        yield* Option.liftPredicate((value: boolean) => !value)(directForward)
        yield* Option.liftPredicate((value: boolean) => value)(parameterBearingCall)

        return nodeMatch(arrowFunction, emptyPreferComposedCallbacksFact)
      }),
      Option.toArray
    )

  return composedCallbackMatches
}

export const preferComposedCallbacksMatcher = nodeMatcher(arrowFunctionKinds)(ts.isArrowFunction)(
  preferComposedCallbacksMatches
)
