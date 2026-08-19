import { Array, Function, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { callExpressionOf } from "../../support/callExpressionOf.js"
import { importedEffectApiAt } from "../../support/effectApi/importedEffectApiAt.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { identifierTextIsPipe } from "./identifierTextIsPipe.js"

export const callArgumentAt = (index: number) => (call: ts.CallExpression) =>
  Option.fromNullishOr(call.arguments[index])

export const effectApiCall =
  (checker: ts.TypeChecker) => (namespace: string) => (names: ReadonlyArray<string>) => {
    const isEffectApi = importedEffectApiAt(checker)(namespace)(names)

    return flow(
      Struct.get<ts.CallExpression, "expression">("expression"),
      unwrapCallee,
      isEffectApi
    )
  }

export const hasAncestor =
  (predicate: (candidate: ts.Node) => boolean) =>
  (node: ts.Node): boolean => {
    const visit = (current: ts.Node): boolean => {
      const matches = predicate(current)
      const parent = Option.fromNullishOr(current.parent)

      return matches || Option.exists(parent, visit)
    }

    const parent = Option.fromNullishOr(node.parent)

    return Option.exists(parent, visit)
  }

export const isFunctionLikeExpression = (
  initializer: ts.Expression
): initializer is ts.ArrowFunction | ts.FunctionExpression => {
  const asArrow = ts.isArrowFunction(initializer)
  const asFunction = ts.isFunctionExpression(initializer)

  return asArrow || asFunction
}

export const effectApiReference =
  (checker: ts.TypeChecker) => (namespace: string) => (names: ReadonlyArray<string>) =>
    flow(unwrapTransparentExpression, importedEffectApiAt(checker)(namespace)(names))

const pipeNames = Array.of("pipe")

export const isPipeCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const callee = unwrapCallee(call.expression)
  const fromEffect = importedEffectApiAt(checker)("Function")(pipeNames)(callee)

  const pipeIdentifier = pipe(
    Option.liftPredicate(ts.isIdentifier)(callee),
    Option.exists(identifierTextIsPipe)
  )

  const flags = Array.make(fromEffect, pipeIdentifier)

  return Array.some(flags, Boolean)
}

export const isExpressionReferenceNode = (candidate: ts.Node): candidate is ts.Expression => {
  const asIdentifier = ts.isIdentifier(candidate)
  const asProperty = ts.isPropertyAccessExpression(candidate)

  return asIdentifier || asProperty
}

const stagesContainExpression =
  (expression: ts.Expression) => (stages: ReadonlyArray<ts.Expression>) =>
    Array.some(stages, strictEqual(expression))

const pipeParentContainsStage =
  (checker: ts.TypeChecker) => (expression: ts.Expression) => (parent: ts.Node) =>
    pipe(
      Option.liftPredicate(ts.isCallExpression)(parent),
      Option.filter(isPipeCall(checker)),
      Option.map(flow(Struct.get("arguments"), Array.fromIterable)),
      Option.exists(stagesContainExpression(expression))
    )

export const expressionIsPipeStage = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    Option.fromNullishOr(expression.parent),
    Option.exists(pipeParentContainsStage(checker)(expression))
  )

export const callOrPipeStageSubject =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (node: ts.Node): Option.Option<ts.Node> => {
    const matchesCall = effectApiCall(checker)(namespace)(names)
    const matchesReference = effectApiReference(checker)(namespace)(names)

    const asCall = pipe(
      callExpressionOf(node),
      Option.filter(matchesCall),
      Option.map((call) => call as ts.Node)
    )

    const asReference = pipe(
      Option.liftPredicate(isExpressionReferenceNode)(node),
      Option.filter(matchesReference),
      Option.filter(expressionIsPipeStage(checker)),
      Option.map((expression) => expression as ts.Node)
    )

    return pipe(asCall, Option.orElse(Function.constant(asReference)))
  }

export const typeSymbolName = (type: ts.Type) => {
  const rawSymbol = type.getSymbol()
  const symbol = Option.fromNullishOr(rawSymbol)
  const alias = Option.fromNullishOr(type.aliasSymbol)

  return pipe(
    symbol,
    Option.orElse(Function.constant(alias)),
    Option.map(Struct.get("name")),
    Option.getOrElse(Function.constant(""))
  )
}
