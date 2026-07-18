import { Array, Function, Match, Option, Predicate, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import {
  importedEffectApiAt,
  isTopLevelExportedDeclaration
} from "../functionalCoreEffect/support.js"
import {
  functionInitializer,
  hasExportModifier,
  hasParameters,
  isFunctionInitializer,
  unwrapTransparentExpression
} from "../support/tsNode.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { makeRuleFinding } from "./makeFindings.js"
import { inspectEffectFnCall } from "./reportedSchemaEffectFnShared.js"
import {
  expressionTypeIsEffectReturning,
  functionLikeReturnsEffect,
  initializerIsNamedEffectFn
} from "./reportedSchemaEffectReturn.js"

const effectGenNames = Array.of("gen")

const serviceMethodFinding = makeRuleFinding("service-method-effect-fn")

const isEffectGenCall = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isCallExpression),
    Option.exists((call) => importedEffectApiAt(checker, call.expression, "Effect", effectGenNames))
  )

const returnedExpressionOfFunction = (declaration: ts.ArrowFunction | ts.FunctionExpression) =>
  pipe(
    Match.value(declaration.body),
    Match.when(ts.isBlock, (block) =>
      pipe(
        Array.fromIterable(block.statements),
        Array.findFirst(ts.isReturnStatement),
        Option.flatMap((statement) => Option.fromNullishOr(statement.expression))
      )
    ),
    Match.orElse(Option.some as (expression: ts.Expression) => Option.Option<ts.Expression>)
  )

const isPreferEffectFnOverlapShape =
  (checker: ts.TypeChecker) => (declaration: ts.VariableDeclaration) =>
    pipe(
      functionInitializer(declaration),
      Option.filter(hasParameters),
      Option.filter(functionLikeReturnsEffect(checker)),
      Option.flatMap(returnedExpressionOfFunction),
      Option.exists(isEffectGenCall(checker))
    )

const exportedVariableDeclaration = (node: ts.VariableDeclaration) =>
  pipe(
    node.parent,
    Option.liftPredicate(ts.isVariableDeclarationList),
    Option.map(Struct.get("parent")),
    Option.filter(ts.isVariableStatement),
    Option.filter((statement) => {
      const hasExport = hasExportModifier(statement)
      const isTopLevelExport = isTopLevelExportedDeclaration(node)
      const checks = Array.make(hasExport, isTopLevelExport)

      return Array.some(checks, Boolean)
    }),
    Option.as(node)
  )

const variableInitializerNeedsEffectFn =
  (checker: ts.TypeChecker) => (initializer: ts.Expression) => {
    const current = unwrapTransparentExpression(initializer)
    const isFunction = isFunctionInitializer(current)
    const effectFnInspection = inspectEffectFnCall(checker)(current)
    const isEffectFn = Option.isSome(effectFnInspection)
    const expressionReturnsEffect = expressionTypeIsEffectReturning(checker)(current)
    const functionReturnsEffect = isFunction && functionLikeReturnsEffect(checker)(current)
    const returnsEffectChecks = Array.make(expressionReturnsEffect, functionReturnsEffect)
    const returnsEffect = Array.some(returnsEffectChecks, Boolean)
    const named = initializerIsNamedEffectFn(checker)(current)
    const shouldInspectChecks = Array.make(returnsEffect, isEffectFn)
    const shouldInspect = Array.some(shouldInspectChecks, Boolean)
    const notNamed = !named
    const reportChecks = Array.make(shouldInspect, notNamed)

    return Array.every(reportChecks, Boolean)
  }

const qualityFromVariableNode = (context: CheckContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node),
    Option.flatMap(exportedVariableDeclaration),
    Option.filter(Predicate.not(isPreferEffectFnOverlapShape(context.checker))),
    Option.filter((declaration) => ts.isIdentifier(declaration.name)),
    Option.flatMap((declaration) =>
      pipe(
        Option.fromNullishOr(declaration.initializer),
        Option.filter(variableInitializerNeedsEffectFn(context.checker)),
        Option.map(() => {
          const name = declaration.name as ts.Identifier

          return serviceMethodFinding(name.text)(name)
        })
      )
    )
  )

const functionDeclarationHasName = flow(
  (declaration: ts.FunctionDeclaration) => Option.fromNullishOr(declaration.name),
  Option.isSome
)

const functionDeclarationIsExported = (declaration: ts.FunctionDeclaration) => {
  const hasExport = hasExportModifier(declaration)
  const isTopLevelExport = isTopLevelExportedDeclaration(declaration)
  const checks = Array.make(hasExport, isTopLevelExport)

  return Array.some(checks, Boolean)
}

const qualityFromFunctionNode = (context: CheckContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(node),
    Option.filter(functionDeclarationHasName),
    Option.filter(functionDeclarationIsExported),
    Option.filter(functionLikeReturnsEffect(context.checker)),
    Option.map((declaration) => {
      const nameOption = Option.fromNullishOr(declaration.name)

      const evidence = pipe(
        nameOption,
        Option.map((name): ts.Node => name),
        Option.getOrElse(Function.constant(declaration))
      )

      const subject = pipe(
        nameOption,
        Option.map(Struct.get("text")),
        Option.getOrElse(Function.constant("function"))
      )

      return serviceMethodFinding(subject)(evidence)
    })
  )

export const exportedEffectFunctionFindings = (
  context: CheckContext,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const fromVariable = qualityFromVariableNode(context)(node)
  const fromFunction = qualityFromFunctionNode(context)(node)
  const candidates = Array.make(fromVariable, fromFunction)

  return pipe(candidates, Array.flatMap(Option.toArray))
}
