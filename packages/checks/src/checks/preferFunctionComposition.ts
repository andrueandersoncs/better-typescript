import { Array, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  isFunctionInitializer,
  unwrapTransparentExpression
} from "./support/tsNode.js"
import { foldAst } from "@better-typescript/core/engine/sources"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

const message =
  "Avoid block bodies that only bind a value and thread it into a call."

const hint =
  "Use pipe, flow, or Function.compose (or a related Function combinator) so the " +
  "steps compose as an expression instead of a manually threaded local. Do not nest " +
  "the calls."

const unwrapTowerCarrier = (expression: ts.Expression): ts.Expression =>
  ts.isNonNullExpression(expression)
    ? unwrapTowerCarrier(expression.expression)
    : unwrapTransparentExpression(expression)

const identifierText = Struct.get("text")

const carrierIdentifier = (
  expression: ts.Expression
): Option.Option<ts.Identifier> =>
  pipe(
    expression,
    unwrapTowerCarrier,
    Option.some,
    Option.filter(ts.isIdentifier)
  )

const isPipeCallee = (expression: ts.Expression): boolean =>
  pipe(
    carrierIdentifier(expression),
    Option.map(identifierText),
    Option.exists((text) => text === "pipe")
  )

const isSeedIdentifier =
  (name: string) =>
  (expression: ts.Expression): boolean =>
    pipe(
      carrierIdentifier(expression),
      Option.map(identifierText),
      Option.exists((text) => text === name)
    )

const callFirstArgument = (
  call: ts.CallExpression
): Option.Option<ts.Expression> => Option.fromNullable(call.arguments[0])

const isUnaryCallTowerOver =
  (name: string) =>
  (expression: ts.Expression): boolean => {
    const carrier = unwrapTowerCarrier(expression)
    const seedMatch = isSeedIdentifier(name)(carrier)
    const callOption = Option.liftPredicate(ts.isCallExpression)(carrier)

    const pipeTower = pipe(
      callOption,
      Option.filter((call) => isPipeCallee(call.expression)),
      Option.flatMap(callFirstArgument),
      Option.exists(isUnaryCallTowerOver(name))
    )

    const unaryTower = pipe(
      callOption,
      Option.filter((call) => call.arguments.length === 1),
      Option.filter((call) => !isPipeCallee(call.expression)),
      Option.flatMap(callFirstArgument),
      Option.exists(isUnaryCallTowerOver(name))
    )

    const conditions = Array.make(seedMatch, pipeTower, unaryTower)
    return Array.some(conditions, Boolean)
  }

const functionCompositionMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (arrowFunction: ts.ArrowFunction): ReadonlyArray<Detection> =>
    pipe(
      Option.liftPredicate(ts.isBlock)(arrowFunction.body),
      Option.filter((body) => body.statements.length === 2),
      Option.flatMap((body) =>
        Option.gen(function* () {
          const firstStatement = yield* Option.fromNullable(body.statements[0])
          const secondStatement = yield* Option.fromNullable(body.statements[1])

          const declarationList = yield* pipe(
            Option.liftPredicate(ts.isVariableStatement)(firstStatement),
            Option.map(Struct.get("declarationList"))
          )

          const isConstList = (declarationList.flags & ts.NodeFlags.Const) !== 0

          const hasOneDeclaration = declarationList.declarations.length === 1

          yield* Option.liftPredicate((value: boolean) => value)(isConstList)
          yield* Option.liftPredicate((value: boolean) => value)(
            hasOneDeclaration
          )

          const binding = yield* Option.fromNullable(
            declarationList.declarations[0]
          )

          yield* Option.liftPredicate(ts.isIdentifier)(binding.name)

          const initializer = yield* Option.fromNullable(binding.initializer)
          yield* Option.liftPredicate(
            (value: ts.Expression) => !isFunctionInitializer(value)
          )(initializer)

          const returned = yield* pipe(
            Option.liftPredicate(ts.isReturnStatement)(secondStatement),
            Option.flatMap((statement) =>
              Option.fromNullable(statement.expression)
            )
          )

          const name = identifierText(binding.name as ts.Identifier)

          const referenceCount = foldAst(
            (count: number, node: ts.Node): number =>
              pipe(
                Option.liftPredicate(ts.isIdentifier)(node),
                Option.map(identifierText),
                Option.exists((text) => text === name)
              )
                ? count + 1
                : count
          )(returned)(0)

          const seedOnly = isSeedIdentifier(name)(returned)
          const singleReference = referenceCount === 1
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
      ),
      Option.toArray
    )

  return matches
}

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

const check = nodeCheck(arrowFunctionKinds)(ts.isArrowFunction)(
  functionCompositionMatches
)

export const preferFunctionComposition: Check = check

export const preferFunctionCompositionExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-function-composition")
