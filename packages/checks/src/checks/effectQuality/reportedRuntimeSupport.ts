import { Array, Function, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { importedEffectApiAt } from "../functionalCoreEffect/support.js"
import { callExpressionOf, unwrapCallee, unwrapTransparentExpression } from "../support/tsNode.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

export const layerAcquisitionNames = Array.make("effect", "effectDiscard", "effectContext")

const pipeNames = Array.of("pipe")

export const effectApiCall =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (node: ts.CallExpression) => {
    const callee = unwrapCallee(node.expression)

    return importedEffectApiAt(checker, callee, namespace, names)
  }

export const effectApiReference =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (expression: ts.Expression) => {
    const unwrapped = unwrapTransparentExpression(expression)

    return importedEffectApiAt(checker, unwrapped, namespace, names)
  }

export const callArgumentAt = (index: number) => (call: ts.CallExpression) =>
  Option.fromNullishOr(call.arguments[index])

export const objectLiteralArgument = flow(
  unwrapTransparentExpression,
  Option.liftPredicate(ts.isObjectLiteralExpression)
)

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

export const identifierTextIsPipe = (identifier: ts.Identifier) =>
  strictEqual(identifier.text, "pipe")

export const isPipeCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const callee = unwrapCallee(call.expression)
  const fromEffect = importedEffectApiAt(checker, callee, "Function", pipeNames)

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

const stageEqualsExpression = (expression: ts.Expression) => (stage: ts.Expression) =>
  strictEqual(stage, expression)

const stagesContainExpression =
  (expression: ts.Expression) => (stages: ReadonlyArray<ts.Expression>) =>
    Array.some(stages, stageEqualsExpression(expression))

const pipeParentContainsStage =
  (checker: ts.TypeChecker) => (expression: ts.Expression) => (parent: ts.Node) =>
    pipe(
      Option.liftPredicate(ts.isCallExpression)(parent),
      Option.filter(isPipeCall(checker)),
      Option.map(flow(Struct.get("arguments"), Array.fromIterable)),
      Option.exists(stagesContainExpression(expression))
    )

const expressionIsPipeStage = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
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
  const rawAlias = type.aliasSymbol
  const alias = Option.fromNullishOr(rawAlias)

  return pipe(
    symbol,
    Option.orElse(Function.constant(alias)),
    Option.map(Struct.get("name")),
    Option.getOrElse(Function.constant(""))
  )
}

export const isFunctionLikeExpression = (
  initializer: ts.Expression
): initializer is ts.ArrowFunction | ts.FunctionExpression => {
  const asArrow = ts.isArrowFunction(initializer)
  const asFunction = ts.isFunctionExpression(initializer)

  return asArrow || asFunction
}
