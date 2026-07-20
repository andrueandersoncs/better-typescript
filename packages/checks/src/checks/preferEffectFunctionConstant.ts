import { Array, Function, HashSet, pipe, Option } from "effect"
import * as ts from "typescript"
import {
  conciseArrowBody,
  declarationListIsConst,
  isFunctionInitializer,
  unwrapExpression,
  variableDeclarationNameIsIdentifier
} from "./support/tsNode.js"
import { makeCheck } from "../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeDetection } from "@better-typescript/core/engine/check"

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

const fallbackModifiers = Function.constant(emptyModifiers)

const message = "Avoid a handwritten constant thunk."

const modifierIsAsync = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.AsyncKeyword

const hasElements = (items: ReadonlyArray<unknown>) => items.length > 0

const hasSingleElement = (items: ReadonlyArray<unknown>) => items.length === 1

const isEligibleFunction = (node: ts.Node) =>
  pipe(
    Option.liftPredicate(isFunctionInitializer)(node),
    Option.map((initializer) => {
      const modifiers = pipe(
        Option.gen(function* () {
          const nodeWithModifiers = yield* Option.liftPredicate(ts.canHaveModifiers)(initializer)
          const modifiers = ts.getModifiers(nodeWithModifiers)

          return yield* Option.fromNullishOr(modifiers)
        }),
        Option.getOrElse(fallbackModifiers)
      )

      const hasAsync = Array.some(modifiers, modifierIsAsync)

      const hasGenerator = pipe(
        Option.gen(function* () {
          const functionExpression = yield* Option.liftPredicate(ts.isFunctionExpression)(
            initializer
          )

          return yield* Option.fromNullishOr(functionExpression.asteriskToken)
        }),
        Option.isSome
      )

      const hasTypeParameters = pipe(
        Option.fromNullishOr(initializer.typeParameters),
        Option.exists(hasElements)
      )

      const eligibility = Array.make(
        initializer.parameters.length === 0,
        !hasAsync,
        !hasGenerator,
        !hasTypeParameters
      )

      return Array.every(eligibility, Boolean)
    }),
    Option.getOrElse(Function.constFalse)
  )

const blockReturnedExpression = (body: ts.Block) =>
  Option.gen(function* () {
    yield* Option.liftPredicate(hasSingleElement)(body.statements)
    const statement = yield* Array.head(body.statements)
    const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(statement)

    return yield* Option.fromNullishOr(returnStatement.expression)
  })

const constantThunkReturnedExpression = (node: ts.Node): Option.Option<ts.Expression> => {
  if (!isFunctionInitializer(node)) {
    return Option.none()
  }

  return ts.isArrowFunction(node)
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
}

const isPrimitiveLiteralExpression = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)

  return HashSet.has(primitiveLiteralKinds, unwrapped.kind)
}

const variableDeclarationList = (declaration: ts.VariableDeclaration) =>
  pipe(Option.some(declaration.parent), Option.filter(ts.isVariableDeclarationList))

const declarationListHasSingleDeclaration = (declarationList: ts.VariableDeclarationList) =>
  hasSingleElement(declarationList.declarations)

const functionConstantMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (node: ts.Node): ReadonlyArray<Detection> => {
    const declarationIsInSourceFile = (candidate: ts.Declaration) =>
      candidate.getSourceFile() === context.sourceFile

    const declarationPrecedesNode = (candidate: ts.VariableDeclaration) =>
      candidate.end <= node.getStart(context.sourceFile)

    const identifierIsStableConst = (identifier: ts.Identifier) =>
      pipe(
        Option.gen(function* () {
          const symbolCandidate = context.checker.getSymbolAtLocation(identifier)
          const symbol = yield* Option.fromNullishOr(symbolCandidate)
          const declarationCandidates = symbol.getDeclarations()
          const declarations = yield* Option.fromNullishOr(declarationCandidates)

          yield* Option.liftPredicate(hasSingleElement)(declarations)
          const declaration = yield* Array.head(declarations)

          const variableDeclaration = yield* Option.liftPredicate(ts.isVariableDeclaration)(
            declaration
          )

          yield* Option.liftPredicate(variableDeclarationNameIsIdentifier)(variableDeclaration)
          yield* Option.liftPredicate(declarationIsInSourceFile)(variableDeclaration)
          yield* Option.liftPredicate(declarationPrecedesNode)(variableDeclaration)

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

    return pipe(
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
          Option.exists(identifierIsStableConst)
        )

        const constantExpressionFlags = Array.make(isPrimitive, isStableIdentifier)
        const isConstantExpression = Array.some(constantExpressionFlags, Boolean)

        yield* Option.liftPredicate(Function.constant(isConstantExpression))(expression)
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
  }

  return matches
}

export const preferEffectFunctionConstant = makeCheck(
  "prefer-effect-function-constant",
  constantThunkKinds,
  isFunctionInitializer,
  functionConstantMatches
)
