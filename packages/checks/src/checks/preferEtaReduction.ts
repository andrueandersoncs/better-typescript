import { Tuple, Array, Function, Option, Predicate, Struct, pipe } from "effect"
import * as ts from "typescript"
import { conciseArrowBody, unwrapCarrier } from "./support/tsNode.js"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"

const message = "Avoid wrapping a function call that only forwards its argument."

const etaHint =
  "Eta-reduce this arrow to the function value itself (pass f instead of " +
  "(x) => f(x)). If the callee is already partially applied, use that partial " +
  "directly. Do not nest calls."

const flowHint =
  "Replace this nested unary call tower with flow(...steps) left-to-right " +
  "(innermost callee first). Do not nest the calls."

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()

const identifierText = Struct.get<ts.Identifier, "text">("text")

const etaReductionMatches = (context: CheckContext) => {
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

  const referenceCount = (name: string): ((node: ts.Node) => number) => {
    const isNameText = (text: string) => text === name

    return Function.flip(
      foldAst((count: number, current: ts.Node): number =>
        pipe(
          Option.liftPredicate(ts.isIdentifier)(current),
          Option.map(identifierText),
          Option.exists(isNameText)
        )
          ? count + 1
          : count
      )
    )(0)
  }

  const unaryCalleeTower =
    (parameterName: string) =>
    (expression: ts.Expression): Option.Option<ReadonlyArray<ts.Expression>> => {
      const unwrapped = unwrapCarrier(expression)
      const hasOneArgument = (call: ts.CallExpression) => call.arguments.length === 1

      const callOption = pipe(
        Option.liftPredicate(ts.isCallExpression)(unwrapped),
        Option.filter(hasOneArgument)
      )

      const isParameterName = (text: string) => text === parameterName

      const calleesFromCall = (call: ts.CallExpression) =>
        Option.gen(function* () {
          const onlyArgument = yield* Option.fromNullishOr(call.arguments[0])
          const argument = unwrapCarrier(onlyArgument)
          const callee = call.expression
          const mentionCount = referenceCount(parameterName)(callee)
          const calleeMentionsParameter = mentionCount > 0

          yield* Option.liftPredicate((value: boolean) => !value)(calleeMentionsParameter)

          const argumentIdentifier = Option.liftPredicate(ts.isIdentifier)(argument)

          const argumentIsParameter = pipe(
            argumentIdentifier,
            Option.map(identifierText),
            Option.exists(isParameterName)
          )

          if (argumentIsParameter) {
            return Tuple.make(callee)
          }

          const inner = yield* unaryCalleeTower(parameterName)(argument)

          return Array.append(inner, callee)
        })

      return pipe(callOption, Option.flatMap(calleesFromCall))
    }

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
        const callees = yield* unaryCalleeTower(parameterName)(body)
        const hasSteps = Array.length(callees) > 0
        const freeCallees = Array.every(callees, Predicate.not(calleeRequiresThis))

        yield* Option.liftPredicate((value: boolean) => value)(hasSteps)
        yield* Option.liftPredicate((value: boolean) => value)(freeCallees)

        const isSingleStep = Array.length(callees) === 1

        return match({
          node: arrowFunction,
          message,
          hint: isSingleStep ? etaHint : flowHint
        })
      }),
      Option.toArray
    )

  return matches
}

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

export const preferEtaReduction = makeCheck(
  "prefer-eta-reduction",
  arrowFunctionKinds,
  ts.isArrowFunction,
  etaReductionMatches
)
