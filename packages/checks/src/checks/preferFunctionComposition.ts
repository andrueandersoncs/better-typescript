import { Array, Function, Option, pipe, Predicate, Struct } from "effect"
import * as ts from "typescript"
import { isFunctionInitializer, unwrapTransparentExpression } from "./support/tsNode.js"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const message = "Avoid block bodies that only bind a value and thread it into a call."

const hint =
  "Use pipe, flow, or Function.compose (or a related Function combinator) so the " +
  "steps compose as an expression instead of a manually threaded local. Do not nest " +
  "the calls."

const unwrapTowerCarrier = (expression: ts.Expression): ts.Expression =>
  ts.isNonNullExpression(expression)
    ? unwrapTowerCarrier(expression.expression)
    : unwrapTransparentExpression(expression)

const identifierText = Struct.get<ts.Identifier, "text">("text")

const carrierIdentifier = (expression: ts.Expression) =>
  pipe(expression, unwrapTowerCarrier, Option.some, Option.filter(ts.isIdentifier))

const isPipeText = (text: string) => strictEqual(text, "pipe")

const isPipeCallee = (expression: ts.Expression) =>
  pipe(carrierIdentifier(expression), Option.map(identifierText), Option.exists(isPipeText))

const isSeedIdentifier = (name: string) => (expression: ts.Expression) => {
  const isSeedText = (text: string) => strictEqual(text, name)

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
    const callHasOneArgument = (call: ts.CallExpression) => strictEqual(call.arguments.length, 1)

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

  const matches = (arrowFunction: ts.ArrowFunction): ReadonlyArray<Detection> => {
    const hasTwoStatements = (body: ts.Block) => strictEqual(body.statements.length, 2)

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
        const hasOneDeclaration = strictEqual(declarationList.declarations.length, 1)

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
        const isBindingName = (text: string) => strictEqual(text, name)

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
        const singleReference = strictEqual(referenceCount, 1)
        const tower = isUnaryCallTowerOver(name)(returned)
        const threaded = singleReference && tower
        const keepThreaded = !seedOnly

        yield* Option.liftPredicate((value: boolean) => value)(keepThreaded)
        yield* Option.liftPredicate((value: boolean) => value)(threaded)

        return match({
          node: body,
          message,
          hint
        })
      })

    return pipe(
      Option.liftPredicate(ts.isBlock)(arrowFunction.body),
      Option.filter(hasTwoStatements),
      Option.flatMap(compositionFromBody),
      Option.toArray
    )
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
