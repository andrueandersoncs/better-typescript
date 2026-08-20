import { Array, Data, Function, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { importedEffectApiAt } from "../../support/effectApi/importedEffectApiAt.js"

import { isFunctionInitializer } from "../../support/isFunctionInitializer.js"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import { unwrapCallee } from "../../support/unwrapCallee.js"

// This state is explicit because both Effect.fn forms need one normalized name inspection.
export class EffectFnNameInspection extends Data.Class<{
  readonly node: ts.Node
  readonly name: Option.Option<string>
}> {}

export const effectFnNames = Array.of("fn")

export const isEffectFnApi = (checker: ts.TypeChecker) =>
  flow(unwrapCallee, importedEffectApiAt(checker)("Effect")(effectFnNames))

export const makeEffectFnNameInspection = (name: Option.Option<string>) => (node: ts.Node) =>
  new EffectFnNameInspection({ node, name })

export const effectFnNameLiteral = (call: ts.CallExpression) =>
  pipe(Array.head(call.arguments), Option.filter(ts.isStringLiteralLike))

export const nestedEffectFnNameLiteral = (call: ts.CallExpression) =>
  pipe(
    effectFnNameLiteral(call),
    Option.orElse(() =>
      pipe(
        call.expression,
        Option.liftPredicate(ts.isCallExpression),
        Option.flatMap(effectFnNameLiteral)
      )
    )
  )

export const nestedCallIsEffectFnApi = (checker: ts.TypeChecker) =>
  flow(Struct.get<ts.CallExpression, "expression">("expression"), isEffectFnApi(checker))

export const nameLiteralAsNode = (literal: ts.StringLiteralLike): ts.Node => literal

export const effectFnNameInspectionFromNested = (nested: ts.CallExpression) => {
  const nameLiteral = nestedEffectFnNameLiteral(nested)

  const targetNode = pipe(
    nameLiteral,
    Option.map(nameLiteralAsNode),
    Option.getOrElse(Function.constant(nested.expression))
  )

  const name = pipe(nameLiteral, Option.map(Struct.get("text")))

  return makeEffectFnNameInspection(name)(targetNode)
}

export const inspectNamedEffectFnForm = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    call.expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isCallExpression),
    Option.filter(nestedCallIsEffectFnApi(checker)),
    Option.map(effectFnNameInspectionFromNested)
  )

export const argumentIsEffectFnBody = (argument: ts.Expression) => {
  const isFunction = isFunctionInitializer(argument)
  const isSelfBinding = ts.isObjectLiteralExpression(argument)
  const checks = Array.make(isFunction, isSelfBinding)

  return Array.some(checks, Boolean)
}

export const inspectBodyEffectFnForm = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const isEffectFn = isEffectFnApi(checker)(call.expression)
  const firstArgument = pipe(Array.head(call.arguments), Option.map(unwrapTransparentExpression))
  const isBodyForm = pipe(firstArgument, Option.exists(argumentIsEffectFnBody))
  const emptyName = Option.none<string>()
  const inspection = makeEffectFnNameInspection(emptyName)(call.expression)

  return isEffectFn && isBodyForm ? Option.some(inspection) : Option.none()
}

export const inspectBodyEffectFnFormFallback =
  (checker: ts.TypeChecker) => (call: ts.CallExpression) => () =>
    inspectBodyEffectFnForm(checker)(call)

export const inspectEffectFnForms = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    inspectNamedEffectFnForm(checker)(call),
    Option.orElse(inspectBodyEffectFnFormFallback(checker)(call))
  )

export const inspectEffectFnCall = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isCallExpression),
    Option.flatMap(inspectEffectFnForms(checker))
  )
