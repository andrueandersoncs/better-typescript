import { Function, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import {
  conciseArrowBody,
  returnedExpression as returnedStatementExpression,
  unwrapExpression
} from "./support/tsNode.js"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { MakeDetection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
type ConstantThunk = ts.ArrowFunction | ts.FunctionExpression

const constantThunkKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression
]

const primitiveLiteralKinds = HashSet.make(
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword
)

const emptyModifiers: ReadonlyArray<ts.ModifierLike> = []

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
  const hasAsync = modifiers.some(modifierIsAsync)
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

  return [
    node.parameters.length === 0,
    !hasAsync,
    !hasGenerator,
    !hasTypeParameters
  ].every(Boolean)
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

const arrowBlockReturnedExpression =
  (node: ts.ArrowFunction) => (): Option.Option<ts.Expression> =>
    pipe(
      Option.some(node.body),
      Option.filter(ts.isBlock),
      Option.flatMap(blockReturnedExpression)
    )

const constantThunkReturnedExpression = (
  node: ConstantThunk
): Option.Option<ts.Expression> =>
  ts.isArrowFunction(node)
    ? pipe(
        conciseArrowBody(node),
        Option.orElse(arrowBlockReturnedExpression(node))
      )
    : blockReturnedExpression(node.body)

const isPrimitiveLiteralExpression = (expression: ts.Expression): boolean => {
  const unwrapped = unwrapExpression(expression)

  return HashSet.has(primitiveLiteralKinds, unwrapped.kind)
}

const sourceFileOwnsDeclaration =
  (sourceFile: ts.SourceFile) =>
  (declaration: ts.Declaration): boolean =>
    declaration.getSourceFile() === sourceFile

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

const declarationPrecedesFunction =
  (sourceFile: ts.SourceFile) =>
  (functionNode: ConstantThunk) =>
  (declaration: ts.VariableDeclaration): boolean =>
    declaration.end <= functionNode.getStart(sourceFile)

const precedingConstIdentifierDeclaration =
  (sourceFile: ts.SourceFile) =>
  (functionNode: ConstantThunk) =>
  (declaration: ts.Declaration): Option.Option<ts.VariableDeclaration> =>
    Option.gen(function* () {
      const variableDeclaration = yield* Option.liftPredicate(
        ts.isVariableDeclaration
      )(declaration)
      yield* Option.liftPredicate(sourceFileOwnsDeclaration(sourceFile))(
        variableDeclaration
      )
      yield* Option.liftPredicate(declarationNameIsIdentifier)(
        variableDeclaration
      )
      yield* Option.liftPredicate(
        declarationPrecedesFunction(sourceFile)(functionNode)
      )(variableDeclaration)
      yield* pipe(
        Option.some(variableDeclaration),
        Option.flatMap(variableDeclarationList),
        Option.filter(declarationListIsConst),
        Option.filter(declarationListHasSingleDeclaration)
      )

      return variableDeclaration
    })

const identifierResolvesToStableConst =
  (context: CheckContext) =>
  (functionNode: ConstantThunk) =>
  (identifier: ts.Identifier): boolean =>
    pipe(
      Option.gen(function* () {
        const symbolCandidate = context.checker.getSymbolAtLocation(identifier)
        const symbol = yield* Option.fromNullable(symbolCandidate)
        const declarationCandidates = symbol.getDeclarations()
        const declarations = yield* Option.fromNullable(declarationCandidates)
        yield* Option.liftPredicate(hasSingleElement)(declarations)
        const declaration = yield* Option.fromNullable(declarations[0])

        return yield* precedingConstIdentifierDeclaration(context.sourceFile)(
          functionNode
        )(declaration)
      }),
      Option.isSome
    )

const isStableReturnedExpression =
  (context: CheckContext) =>
  (functionNode: ConstantThunk) =>
  (expression: ts.Expression): boolean => {
    const unwrapped = unwrapExpression(expression)
    const isPrimitive = pipe(
      Option.some(unwrapped),
      Option.filter(isPrimitiveLiteralExpression),
      Option.isSome
    )
    const isStableIdentifier = pipe(
      Option.liftPredicate(ts.isIdentifier)(unwrapped),
      Option.exists(identifierResolvesToStableConst(context)(functionNode))
    )

    return [isPrimitive, isStableIdentifier].some(Boolean)
  }

const functionConstantDetection =
  (context: CheckContext) =>
  (match: MakeDetection) =>
  (node: ConstantThunk): Option.Option<Detection> =>
    Option.gen(function* () {
      yield* Option.liftPredicate(isEligibleFunction)(node)
      const expression = yield* pipe(
        Option.some(node),
        Option.flatMap(constantThunkReturnedExpression)
      )
      yield* Option.liftPredicate(isStableReturnedExpression(context)(node))(
        expression
      )
      const expressionText = expression.getText(context.sourceFile)

      return match({
        node,
        message,
        hint:
          `Use Function.constant(${expressionText}) from Effect when a zero-argument function only returns a stable value. ` +
          "Function.constant captures that value once and returns a zero-argument function."
      })
    })

const functionConstantMatches = (context: CheckContext) => {
  const match = detection(context)
  const ruleMatch = functionConstantDetection(context)(match)

  const matches = (node: ConstantThunk): ReadonlyArray<Detection> =>
    pipe(ruleMatch(node), Option.toArray)

  return matches
}

const check = nodeCheck(constantThunkKinds)(isConstantThunk)(
  functionConstantMatches
)

export const preferEffectFunctionConstant: Check = check

export const preferEffectFunctionConstantExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-function-constant")
