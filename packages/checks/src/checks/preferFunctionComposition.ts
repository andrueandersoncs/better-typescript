import { Array, Function, Option, Tuple, pipe, Predicate, Struct } from "effect"
import * as ts from "typescript"
import { isFunctionInitializer, unwrapTransparentExpression } from "./support/tsNode.js"
import { unaryAdapter } from "./support/unaryAdapter.js"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const blockMessage = "Avoid block bodies that only bind a value and thread it into a call."

const blockHint =
  "Use pipe, flow, or Function.compose (or a related Function combinator) so the " +
  "steps compose as an expression instead of a manually threaded local. Do not nest " +
  "the calls."

const adapterMessage = "Avoid unary adapters that project a property into a partial function."

const adapterHint = (typeText: string, propertyName: string, partialText: string) =>
  `Use flow(Struct.get<${typeText}>(${JSON.stringify(propertyName)}), ${partialText}) instead.`

const hasOneArgument = Function.flow(
  Struct.get<ts.CallExpression, "arguments">("arguments"),
  Array.length,
  strictEqual(1)
)

const hasNoOptionalChain = Function.flow(
  Struct.get<ts.PropertyAccessExpression, "questionDotToken">("questionDotToken"),
  Option.fromNullishOr,
  Option.isNone
)

const propertyComposedAdapter = (node: ts.Node) =>
  pipe(
    unaryAdapter(node),
    Option.flatMap((adapter) => {
      const result = Option.gen(function* () {
        const outer = Tuple.get(adapter, 3)
        const call = yield* Option.liftPredicate(ts.isCallExpression)(outer)
        yield* Option.liftPredicate(hasOneArgument)(call)

        const argument = yield* pipe(call.arguments, Array.head)
        const parameterName = Tuple.get(adapter, 2).text

        const access = yield* pipe(
          argument,
          unwrapTransparentExpression,
          Option.liftPredicate(ts.isPropertyAccessExpression),
          Option.filter(hasNoOptionalChain),
          Option.filter(
            Function.flow(
              Struct.get<ts.PropertyAccessExpression, "expression">("expression"),
              Option.liftPredicate(ts.isIdentifier),
              Option.map(identifierText),
              Option.exists(strictEqual(parameterName))
            )
          )
        )

        const partial = yield* pipe(
          call.expression,
          unwrapTransparentExpression,
          Option.liftPredicate(ts.isCallExpression),
          Option.filter(hasOneArgument),
          Option.filter(
            Function.flow(
              Struct.get<ts.CallExpression, "expression">("expression"),
              ts.isIdentifier
            )
          )
        )

        return Tuple.make(adapter, access, partial)
      })

      return result
    })
  )

const unwrapTowerCarrier = (expression: ts.Expression): ts.Expression =>
  ts.isNonNullExpression(expression)
    ? unwrapTowerCarrier(expression.expression)
    : unwrapTransparentExpression(expression)

const identifierText = Struct.get<ts.Identifier, "text">("text")

const carrierIdentifier = (expression: ts.Expression) =>
  pipe(expression, unwrapTowerCarrier, Option.some, Option.filter(ts.isIdentifier))

const isPipeText = strictEqual("pipe")

const isPipeCallee = (expression: ts.Expression) =>
  pipe(carrierIdentifier(expression), Option.map(identifierText), Option.exists(isPipeText))

const isSeedIdentifier = (name: string) => (expression: ts.Expression) => {
  const isSeedText = strictEqual(name)

  return pipe(carrierIdentifier(expression), Option.map(identifierText), Option.exists(isSeedText))
}

const callFirstArgument = (call: ts.CallExpression) => Option.fromNullishOr(call.arguments[0])

const isUnaryCallTowerOver =
  (name: string) =>
  (expression: ts.Expression): boolean => {
    const carrier = unwrapTowerCarrier(expression)
    const seedMatch = isSeedIdentifier(name)(carrier)
    const callOption = Option.liftPredicate(ts.isCallExpression)(carrier)

    const callIsPipe = Function.flow(
      Struct.get<ts.CallExpression, "expression">("expression"),
      isPipeCallee
    )

    const callIsNotPipe = Predicate.not(callIsPipe)
    const callHasOneArgument = (call: ts.CallExpression) => strictEqual(1)(call.arguments.length)

    const pipeTower = pipe(
      callOption,
      Option.filter(callIsPipe),
      Option.flatMap(callFirstArgument),
      Option.exists(isUnaryCallTowerOver(name))
    )

    const unaryTower = pipe(
      callOption,
      Option.filter(callHasOneArgument),
      Option.filter(callIsNotPipe),
      Option.flatMap(callFirstArgument),
      Option.exists(isUnaryCallTowerOver(name))
    )

    const conditions = Array.make(seedMatch, pipeTower, unaryTower)
    return Array.some(conditions, Boolean)
  }

const functionCompositionMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const hasTypePredicate = (arrowFunction: ts.ArrowFunction) => {
    const type = context.checker.getTypeAtLocation(arrowFunction)
    const callSignatures = type.getCallSignatures()

    const isTypePredicate = (signature: ts.Signature) => {
      const predicate = context.checker.getTypePredicateOfSignature(signature)
      const predicateOption = Option.fromNullishOr(predicate)

      return Option.isSome(predicateOption)
    }

    return Array.some(callSignatures, isTypePredicate)
  }

  const matches = (arrowFunction: ts.ArrowFunction): ReadonlyArray<Detection> => {
    const hasTwoStatements = (body: ts.Block) => strictEqual(2)(body.statements.length)

    const returnExpression = Function.flow(
      Struct.get<ts.ReturnStatement, "expression">("expression"),
      Option.fromNullishOr
    )

    const compositionFromBody = (body: ts.Block) =>
      Option.gen(function* () {
        const firstStatement = yield* Option.fromNullishOr(body.statements[0])
        const secondStatement = yield* Option.fromNullishOr(body.statements[1])

        const declarationList = yield* pipe(
          Option.liftPredicate(ts.isVariableStatement)(firstStatement),
          Option.map(Struct.get("declarationList"))
        )

        const isConstList = (declarationList.flags & ts.NodeFlags.Const) !== 0
        const hasOneDeclaration = strictEqual(1)(declarationList.declarations.length)

        yield* Option.liftPredicate((value: boolean) => value)(isConstList)
        yield* Option.liftPredicate((value: boolean) => value)(hasOneDeclaration)

        const binding = yield* Option.fromNullishOr(declarationList.declarations[0])

        yield* Option.liftPredicate(ts.isIdentifier)(binding.name)

        const initializer = yield* Option.fromNullishOr(binding.initializer)
        yield* Option.liftPredicate(Predicate.not(isFunctionInitializer))(initializer)

        const returned = yield* pipe(
          Option.liftPredicate(ts.isReturnStatement)(secondStatement),
          Option.flatMap(returnExpression)
        )

        const name = identifierText(binding.name as ts.Identifier)
        const isBindingName = strictEqual(name)

        const referenceCount = foldAst((count: number, node: ts.Node): number =>
          pipe(
            Option.liftPredicate(ts.isIdentifier)(node),
            Option.map(identifierText),
            Option.exists(isBindingName)
          )
            ? count + 1
            : count
        )(returned)(0)

        const seedOnly = isSeedIdentifier(name)(returned)
        const singleReference = strictEqual(1)(referenceCount)
        const tower = isUnaryCallTowerOver(name)(returned)
        const threaded = singleReference && tower
        const keepThreaded = !seedOnly

        yield* Option.liftPredicate((value: boolean) => value)(keepThreaded)
        yield* Option.liftPredicate((value: boolean) => value)(threaded)

        return match({
          node: body,
          message: blockMessage,
          hint: blockHint
        })
      })

    const blockMatches = pipe(
      Option.liftPredicate(ts.isBlock)(arrowFunction.body),
      Option.filter(hasTwoStatements),
      Option.flatMap(compositionFromBody),
      Option.toArray
    )

    const adapterMatches = hasTypePredicate(arrowFunction)
      ? Array.empty()
      : pipe(
          propertyComposedAdapter(arrowFunction),
          Option.flatMap((adapter) => {
            const unary = Tuple.get(adapter, 0)
            const parameter = Tuple.get(unary, 1)
            const access = Tuple.get(adapter, 1)
            const partial = Tuple.get(adapter, 2)

            return pipe(
              Option.fromNullishOr(parameter.type),
              Option.map((type) => {
                const typeText = type.getText(context.sourceFile)
                const propertyName = access.name.text
                const partialText = partial.getText(context.sourceFile)
                const hint = adapterHint(typeText, propertyName, partialText)

                return match({
                  node: arrowFunction,
                  message: adapterMessage,
                  hint
                })
              })
            )
          }),
          Option.toArray
        )

    return Array.appendAll(blockMatches, adapterMatches)
  }

  return matches
}

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

export const preferFunctionComposition = makeCheck(
  "prefer-function-composition",
  arrowFunctionKinds,
  ts.isArrowFunction,
  functionCompositionMatches
)
