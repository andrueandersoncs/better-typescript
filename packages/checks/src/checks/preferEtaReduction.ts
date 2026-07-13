import { Tuple, Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  conciseArrowBody,
  unwrapTransparentExpression
} from "./support/tsNode.js"
import { foldAst } from "@better-typescript/core/engine/sources"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

const message =
  "Avoid wrapping a function call that only forwards its argument."

const etaHint =
  "Eta-reduce this arrow to the function value itself (pass f instead of " +
  "(x) => f(x)). If the callee is already partially applied, use that partial " +
  "directly. Do not nest calls."

const flowHint =
  "Replace this nested unary call tower with flow(...steps) left-to-right " +
  "(innermost callee first). Do not nest the calls."

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()

const identifierText = Struct.get("text")

const unwrapCarrier = (expression: ts.Expression): ts.Expression =>
  ts.isNonNullExpression(expression)
    ? unwrapCarrier(expression.expression)
    : unwrapTransparentExpression(expression)

const etaReductionMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

  const symbolOption = (node: ts.Node): Option.Option<ts.Symbol> =>
    pipe(checker.getSymbolAtLocation(node), Option.fromNullable)

  const resolvedSymbol = (node: ts.Node): Option.Option<ts.Symbol> =>
    pipe(
      symbolOption(node),
      Option.map((symbol) => {
        const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

        return isAlias ? checker.getAliasedSymbol(symbol) : symbol
      })
    )

  const isNamespaceSymbol = (symbol: ts.Symbol): boolean => {
    const declarationList = symbol.getDeclarations()

    const declarations = pipe(
      Option.fromNullable(declarationList),
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

  const propertyAccessRequiresThis = (
    propertyAccess: ts.PropertyAccessExpression
  ): boolean => {
    const namedSymbol = symbolOption(propertyAccess.name)
    const accessSymbol = symbolOption(propertyAccess)

    const propertySymbol = pipe(
      namedSymbol,
      Option.orElse(Function.constant(accessSymbol))
    )

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

  const calleeRequiresThis = (callee: ts.Expression): boolean => {
    const unwrapped = unwrapCarrier(callee)
    const isCall = ts.isCallExpression(unwrapped)
    const isIdentifier = ts.isIdentifier(unwrapped)
    const isFree = isCall || isIdentifier
    const isPropertyAccess = ts.isPropertyAccessExpression(unwrapped)

    const propertyNeedsThis = isPropertyAccess
      ? propertyAccessRequiresThis(unwrapped)
      : true

    const isBound = isFree === false
    const boundCalleeNeedsThis = isBound && propertyNeedsThis

    return boundCalleeNeedsThis
  }

  const referenceCount =
    (name: string) =>
    (node: ts.Node): number =>
      foldAst((count: number, current: ts.Node): number =>
        pipe(
          Option.liftPredicate(ts.isIdentifier)(current),
          Option.map(identifierText),
          Option.exists((text) => text === name)
        )
          ? count + 1
          : count
      )(node)(0)

  const unaryCalleeTower =
    (parameterName: string) =>
    (
      expression: ts.Expression
    ): Option.Option<ReadonlyArray<ts.Expression>> => {
      const unwrapped = unwrapCarrier(expression)

      const callOption = pipe(
        Option.liftPredicate(ts.isCallExpression)(unwrapped),
        Option.filter((call) => call.arguments.length === 1)
      )

      return pipe(
        callOption,
        Option.flatMap((call) =>
          Option.gen(function* () {
            const onlyArgument = yield* Option.fromNullable(call.arguments[0])
            const argument = unwrapCarrier(onlyArgument)
            const callee = call.expression
            const mentionCount = referenceCount(parameterName)(callee)
            const calleeMentionsParameter = mentionCount > 0

            yield* Option.liftPredicate((value: boolean) => !value)(
              calleeMentionsParameter
            )

            const argumentIdentifier = Option.liftPredicate(ts.isIdentifier)(
              argument
            )

            const argumentIsParameter = pipe(
              argumentIdentifier,
              Option.map(identifierText),
              Option.exists((text) => text === parameterName)
            )

            if (argumentIsParameter) {
              return Tuple.make(callee)
            }

            const inner = yield* unaryCalleeTower(parameterName)(argument)

            return Array.append(inner, callee)
          })
        )
      )
    }

  const matches = (arrowFunction: ts.ArrowFunction): ReadonlyArray<Detection> =>
    pipe(
      Option.gen(function* () {
        const hasOneParameter = arrowFunction.parameters.length === 1
        yield* Option.liftPredicate((value: boolean) => value)(hasOneParameter)

        const parameter = yield* Option.fromNullable(
          arrowFunction.parameters[0]
        )

        const hasRest = pipe(
          Option.fromNullable(parameter.dotDotDotToken),
          Option.isSome
        )

        const hasDefault = pipe(
          Option.fromNullable(parameter.initializer),
          Option.isSome
        )

        const isOptional = pipe(
          Option.fromNullable(parameter.questionToken),
          Option.isSome
        )

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

        const freeCallees = Array.every(
          callees,
          (callee) => !calleeRequiresThis(callee)
        )

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
const check = nodeCheck(arrowFunctionKinds)(ts.isArrowFunction)(etaReductionMatches)

export const preferEtaReduction: Check = check

export const preferEtaReductionExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-eta-reduction")
