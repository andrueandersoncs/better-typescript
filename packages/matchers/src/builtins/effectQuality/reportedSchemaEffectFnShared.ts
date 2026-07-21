import { Array, Function, Option, Schema, Struct, pipe, flow } from "effect"
import * as ts from "typescript"
import { importedEffectApiAt } from "../functionalCoreEffect/effectApiMembers.js"
import {
  isFunctionInitializer,
  unwrapCallee,
  unwrapTransparentExpression
} from "../../support/tsNode.js"

const effectFnNames = Array.of("fn")

const stringSchema = Schema.String
const optionalNameSchema = Schema.Option(stringSchema)

const EffectFnNameInspection = Schema.Struct({
  node: Schema.Any,
  name: optionalNameSchema
})

// EffectFnNameInspection pairs node with optional name because filters need both together.
export interface EffectFnNameInspection extends Schema.Schema.Type<typeof EffectFnNameInspection> {}

const makeEffectFnNameInspection = (name: Option.Option<string>) => (node: ts.Node) =>
  EffectFnNameInspection.make({ node, name })

const isEffectFnApi = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const callee = unwrapCallee(expression)

  return importedEffectApiAt(checker, callee, "Effect", effectFnNames)
}

const effectFnNameLiteral = (call: ts.CallExpression) =>
  pipe(Array.head(call.arguments), Option.filter(ts.isStringLiteralLike))

const nestedEffectFnNameLiteral = (call: ts.CallExpression) =>
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

const nestedCallIsEffectFnApi = (checker: ts.TypeChecker) =>
  flow(Struct.get<ts.CallExpression, "expression">("expression"), isEffectFnApi(checker))

const nameLiteralAsNode = (literal: ts.StringLiteralLike): ts.Node => literal

const effectFnNameInspectionFromNested = (nested: ts.CallExpression) => {
  const nameLiteral = nestedEffectFnNameLiteral(nested)

  const evidenceNode = pipe(
    nameLiteral,
    Option.map(nameLiteralAsNode),
    Option.getOrElse(Function.constant(nested.expression))
  )

  const name = pipe(nameLiteral, Option.map(Struct.get("text")))

  return makeEffectFnNameInspection(name)(evidenceNode)
}

const inspectNamedEffectFnForm = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    call.expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isCallExpression),
    Option.filter(nestedCallIsEffectFnApi(checker)),
    Option.map(effectFnNameInspectionFromNested)
  )

const argumentIsEffectFnBody = (argument: ts.Expression) => {
  const isFunction = isFunctionInitializer(argument)
  const isSelfBinding = ts.isObjectLiteralExpression(argument)
  const checks = Array.make(isFunction, isSelfBinding)

  return Array.some(checks, Boolean)
}

const inspectBodyEffectFnForm = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const isEffectFn = isEffectFnApi(checker)(call.expression)
  const firstArgument = pipe(Array.head(call.arguments), Option.map(unwrapTransparentExpression))
  const isBodyForm = pipe(firstArgument, Option.exists(argumentIsEffectFnBody))
  const emptyName = Option.none<string>()
  const inspection = makeEffectFnNameInspection(emptyName)(call.expression)

  return isEffectFn && isBodyForm ? Option.some(inspection) : Option.none()
}

const inspectBodyEffectFnFormFallback =
  (checker: ts.TypeChecker) => (call: ts.CallExpression) => () =>
    inspectBodyEffectFnForm(checker)(call)

const inspectEffectFnForms = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
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
