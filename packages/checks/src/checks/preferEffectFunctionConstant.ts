import { Array, Function, HashSet, pipe, Option } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import {
  conciseArrowBody,
  returnedExpression as returnedStatementExpression,
  unwrapExpression
} from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
type ConstantThunk = ts.ArrowFunction | ts.FunctionExpression

const constantThunkKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression
)

const primitiveLiteralKinds = HashSet.make(
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword
)

const emptyModifiers: ReadonlyArray<ts.ModifierLike> = Array.empty()

const fallbackModifiers: Function.LazyArg<ReadonlyArray<ts.ModifierLike>> =
  Function.constant(emptyModifiers)

const isConstantThunk = (node: ts.Node): node is ConstantThunk =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node)

const message = "Avoid a handwritten constant thunk."

const modifierIsAsync = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.AsyncKeyword

const hasElements = (items: ReadonlyArray<unknown>): boolean => items.length > 0

const hasSingleElement = (items: ReadonlyArray<unknown>): boolean =>
  items.length === 1

const isEligibleFunction = (node: ConstantThunk): boolean => {
  const modifiers = pipe(
    Option.gen(function* () {
      const nodeWithModifiers = yield* Option.liftPredicate(
        ts.canHaveModifiers
      )(node)

      const modifiers = ts.getModifiers(nodeWithModifiers)

      return yield* Option.fromNullable(modifiers)
    }),
    Option.getOrElse(fallbackModifiers)
  )

  const hasAsync = Array.some(modifiers, modifierIsAsync)

  const hasGenerator = pipe(
    Option.gen(function* () {
      const functionExpression = yield* Option.liftPredicate(
        ts.isFunctionExpression
      )(node)

      return yield* Option.fromNullable(functionExpression.asteriskToken)
    }),
    Option.isSome
  )

  const hasTypeParameters = pipe(
    Option.fromNullable(node.typeParameters),
    Option.exists(hasElements)
  )

  const values165 = Array.make(
    node.parameters.length === 0,
    !hasAsync,
    !hasGenerator,
    !hasTypeParameters
  )

  return Array.every(values165, Boolean)
}

const blockReturnedExpression = (
  body: ts.Block
): Option.Option<ts.Expression> =>
  Option.gen(function* () {
    yield* Option.liftPredicate(hasSingleElement)(body.statements)
    const statement = yield* Option.fromNullable(body.statements[0])

    const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(
      statement
    )

    return yield* returnedStatementExpression(returnStatement)
  })

const constantThunkReturnedExpression = (
  node: ConstantThunk
): Option.Option<ts.Expression> =>
  ts.isArrowFunction(node)
    ? pipe(
        conciseArrowBody(node),
        Option.orElse(() =>
          pipe(
            Option.some(node.body),
            Option.filter(ts.isBlock),
            Option.flatMap(blockReturnedExpression)
          )
        )
      )
    : blockReturnedExpression(node.body)

const isPrimitiveLiteralExpression = (expression: ts.Expression): boolean => {
  const unwrapped = unwrapExpression(expression)

  return HashSet.has(primitiveLiteralKinds, unwrapped.kind)
}

const declarationNameIsIdentifier = (
  declaration: ts.VariableDeclaration
): boolean => ts.isIdentifier(declaration.name)

const variableDeclarationList = (
  declaration: ts.VariableDeclaration
): Option.Option<ts.VariableDeclarationList> =>
  pipe(
    Option.some(declaration.parent),
    Option.filter(ts.isVariableDeclarationList)
  )

const declarationListIsConst = (
  declarationList: ts.VariableDeclarationList
): boolean => (declarationList.flags & ts.NodeFlags.Const) !== 0

const declarationListHasSingleDeclaration = (
  declarationList: ts.VariableDeclarationList
): boolean => hasSingleElement(declarationList.declarations)

const functionConstantMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (node: ConstantThunk): ReadonlyArray<Detection> =>
    pipe(
      Option.gen(function* () {
        yield* Option.liftPredicate(isEligibleFunction)(node)

        const expression = yield* pipe(
          Option.some(node),
          Option.flatMap(constantThunkReturnedExpression)
        )

        const unwrapped = unwrapExpression(expression)

        const isPrimitive = pipe(
          Option.some(unwrapped),
          Option.filter(isPrimitiveLiteralExpression),
          Option.isSome
        )

        const isStableIdentifier = pipe(
          Option.liftPredicate(ts.isIdentifier)(unwrapped),
          Option.exists((identifier: ts.Identifier): boolean =>
            pipe(
              Option.gen(function* () {
                const symbolCandidate =
                  context.checker.getSymbolAtLocation(identifier)

                const symbol = yield* Option.fromNullable(symbolCandidate)
                const declarationCandidates = symbol.getDeclarations()

                const declarations = yield* Option.fromNullable(
                  declarationCandidates
                )

                yield* Option.liftPredicate(hasSingleElement)(declarations)
                const declaration = yield* Option.fromNullable(declarations[0])

                const variableDeclaration = yield* Option.liftPredicate(
                  ts.isVariableDeclaration
                )(declaration)

                yield* Option.liftPredicate(
                  (candidate: ts.Declaration): boolean =>
                    candidate.getSourceFile() === context.sourceFile
                )(variableDeclaration)
                yield* Option.liftPredicate(declarationNameIsIdentifier)(
                  variableDeclaration
                )
                yield* Option.liftPredicate(
                  (candidate: ts.VariableDeclaration): boolean =>
                    candidate.end <= node.getStart(context.sourceFile)
                )(variableDeclaration)
                yield* pipe(
                  Option.some(variableDeclaration),
                  Option.flatMap(variableDeclarationList),
                  Option.filter(declarationListIsConst),
                  Option.filter(declarationListHasSingleDeclaration)
                )

                return variableDeclaration
              }),
              Option.isSome
            )
          )
        )

        yield* Option.liftPredicate((_expression: ts.Expression): boolean => {
          const values166 = Array.make(isPrimitive, isStableIdentifier)
          return Array.some(values166, Boolean)
        })(expression)
        const expressionText = expression.getText(context.sourceFile)

        return match({
          node,
          message,
          hint:
            `Use Function.constant(${expressionText}) from Effect when a zero-argument function only returns a stable value. ` +
            "Function.constant captures that value once and returns a zero-argument function."
        })
      }),
      Option.toArray
    )

  return matches
}

const check = nodeCheck(constantThunkKinds)(isConstantThunk)(
  functionConstantMatches
)

export const preferEffectFunctionConstant: Check = check

export const preferEffectFunctionConstantExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-function-constant")
