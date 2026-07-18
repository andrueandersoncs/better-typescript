import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { conciseArrowBody, unwrapCarrier } from "./support/tsNode.js"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"

const message = "Avoid lambdas that only flip the order of a curried application."

const hint =
  "Reorder the curried parameters so the fixed argument comes first " +
  "(data-last), then pass the partial f(y) directly — or use " +
  "Function.flip(f)(y) instead of (x) => f(x)(y)."

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()

const identifierText = Struct.get<ts.Identifier, "text">("text")

const functionFlipMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = makeDetection(context)

  const symbolOption = (node: ts.Node) =>
    pipe(checker.getSymbolAtLocation(node), Option.fromNullishOr)

  const resolvedSymbol = (node: ts.Node) =>
    pipe(
      symbolOption(node),
      Option.map((symbol) => {
        const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

        return isAlias ? checker.getAliasedSymbol(symbol) : symbol
      })
    )

  const isNamespaceSymbol = (symbol: ts.Symbol) => {
    const declarationList = symbol.getDeclarations()

    const declarations = pipe(
      Option.fromNullishOr(declarationList),
      Option.getOrElse(Function.constant(emptyDeclarations))
    )

    const hasVariable = Array.some(declarations, ts.isVariableDeclaration)
    const hasInterface = Array.some(declarations, ts.isInterfaceDeclaration)
    const hasModule = Array.some(declarations, ts.isModuleDeclaration)
    const ambientValue = hasVariable && hasInterface
    const isModule = (symbol.flags & ts.SymbolFlags.Module) !== 0
    const ambientOrModule = ambientValue || hasModule

    return isModule || ambientOrModule
  }

  const propertyAccessRequiresThis = (propertyAccess: ts.PropertyAccessExpression) => {
    const namedSymbol = symbolOption(propertyAccess.name)
    const accessSymbol = symbolOption(propertyAccess)
    const propertySymbol = pipe(namedSymbol, Option.orElse(Function.constant(accessSymbol)))

    const isMethod = pipe(
      propertySymbol,
      Option.map((symbol) => (symbol.flags & ts.SymbolFlags.Method) !== 0),
      Option.getOrElse(Function.constant(false))
    )

    const receiverType = checker.getTypeAtLocation(propertyAccess.expression)
    const constructCount = receiverType.getConstructSignatures().length
    const receiverIsConstructor = constructCount > 0

    const receiverIsNamespace = pipe(
      resolvedSymbol(propertyAccess.expression),
      Option.exists(isNamespaceSymbol)
    )

    const receiverLacksConstructor = receiverIsConstructor === false
    const methodNeedsReceiver = isMethod && receiverLacksConstructor
    const receiverIsInstance = receiverIsNamespace === false
    const instanceMethod = methodNeedsReceiver && receiverIsInstance

    return instanceMethod
  }

  const calleeRequiresThis = (callee: ts.Expression) => {
    const unwrapped = unwrapCarrier(callee)
    const isCall = ts.isCallExpression(unwrapped)
    const isIdentifier = ts.isIdentifier(unwrapped)
    const isFree = isCall || isIdentifier
    const isPropertyAccess = ts.isPropertyAccessExpression(unwrapped)
    const propertyNeedsThis = isPropertyAccess ? propertyAccessRequiresThis(unwrapped) : true
    const isBound = isFree === false
    const boundCalleeNeedsThis = isBound && propertyNeedsThis

    return boundCalleeNeedsThis
  }

  const referenceCount = (name: string): ((node: ts.Node) => number) =>
    Function.flip(
      foldAst((count: number, current: ts.Node): number =>
        pipe(
          Option.liftPredicate(ts.isIdentifier)(current),
          Option.map(identifierText),
          Option.exists((text) => text === name)
        )
          ? count + 1
          : count
      )
    )(0)

  const unaryCall = (expression: ts.Expression) =>
    pipe(
      expression,
      unwrapCarrier,
      Option.liftPredicate(ts.isCallExpression),
      Option.filter((call) => call.arguments.length === 1),
      Option.filter((call) =>
        pipe(
          Option.fromNullishOr(call.arguments[0]),
          Option.exists((argument) => !ts.isSpreadElement(argument))
        )
      )
    )

  const matches = (arrowFunction: ts.ArrowFunction): ReadonlyArray<Detection> =>
    pipe(
      Option.gen(function* () {
        const hasOneParameter = arrowFunction.parameters.length === 1
        yield* Option.liftPredicate((value: boolean) => value)(hasOneParameter)

        const parameter = yield* Option.fromNullishOr(arrowFunction.parameters[0])
        const hasRest = pipe(Option.fromNullishOr(parameter.dotDotDotToken), Option.isSome)
        const hasDefault = pipe(Option.fromNullishOr(parameter.initializer), Option.isSome)
        const isOptional = pipe(Option.fromNullishOr(parameter.questionToken), Option.isSome)
        const isIdentifierName = ts.isIdentifier(parameter.name)
        const hasRestOrDefault = hasRest || hasDefault
        const isComplex = hasRestOrDefault || isOptional
        const isNotComplex = isComplex === false
        const isSimple = isIdentifierName && isNotComplex

        yield* Option.liftPredicate((value: boolean) => value)(isSimple)

        const parameterName = identifierText(parameter.name as ts.Identifier)
        const body = yield* conciseArrowBody(arrowFunction)
        const outerCall = yield* unaryCall(body)
        const outerArgument = yield* Option.fromNullishOr(outerCall.arguments[0])
        const outerParameterRefs = referenceCount(parameterName)(outerArgument)
        const outerMentionsParameter = outerParameterRefs > 0

        yield* Option.liftPredicate((value: boolean) => !value)(outerMentionsParameter)

        const innerCall = yield* unaryCall(outerCall.expression)
        const innerArgument = yield* Option.fromNullishOr(innerCall.arguments[0])
        const innerArgumentCarrier = unwrapCarrier(innerArgument)
        const argumentIdentifier = Option.liftPredicate(ts.isIdentifier)(innerArgumentCarrier)

        const argumentIsParameter = pipe(
          argumentIdentifier,
          Option.map(identifierText),
          Option.exists((text) => text === parameterName)
        )

        yield* Option.liftPredicate((value: boolean) => value)(argumentIsParameter)

        const innerCallee = innerCall.expression
        const calleeParameterRefs = referenceCount(parameterName)(innerCallee)
        const calleeMentionsParameter = calleeParameterRefs > 0

        yield* Option.liftPredicate((value: boolean) => !value)(calleeMentionsParameter)

        const needsThis = calleeRequiresThis(innerCallee)
        yield* Option.liftPredicate((value: boolean) => !value)(needsThis)

        const bodyMentions = referenceCount(parameterName)(body)
        const singleForward = bodyMentions === 1

        yield* Option.liftPredicate((value: boolean) => value)(singleForward)

        return match({
          node: arrowFunction,
          message,
          hint
        })
      }),
      Option.toArray
    )

  return matches
}

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

export const preferFunctionFlip = makeCheck(
  "prefer-function-flip",
  arrowFunctionKinds,
  ts.isArrowFunction,
  functionFlipMatches
)
