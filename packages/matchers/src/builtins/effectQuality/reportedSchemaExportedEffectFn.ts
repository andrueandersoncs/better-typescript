import { Array, Function, Match, Option, Predicate, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import { importedEffectApiAt } from "../functionalCoreEffect/effectApiMembers.js"
import { isTopLevelExportedDeclaration } from "../functionalCoreEffect/functionScope.js"
import {
  functionDeclarationName,
  functionInitializer,
  hasExportModifier,
  hasParameters,
  isFunctionInitializer,
  returnStatementExpression,
  unwrapTransparentExpression,
  variableDeclarationNameIsIdentifier
} from "../../support/tsNode.js"
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

const callIsEffectGen = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  importedEffectApiAt(checker, call.expression, "Effect", effectGenNames)

const isEffectGenCall = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isCallExpression),
    Option.exists(callIsEffectGen(checker))
  )

const returnExpressionFromBlock = (block: ts.Block) =>
  pipe(
    Array.fromIterable(block.statements),
    Array.findFirst(ts.isReturnStatement),
    Option.flatMap(returnStatementExpression)
  )

const returnedExpressionOfFunction = (declaration: ts.ArrowFunction | ts.FunctionExpression) =>
  pipe(
    Match.value(declaration.body),
    Match.when(ts.isBlock, returnExpressionFromBlock),
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

const variableStatementIsExported =
  (node: ts.VariableDeclaration) => (statement: ts.VariableStatement) => {
    const hasExport = hasExportModifier(statement)
    const isTopLevelExport = isTopLevelExportedDeclaration(node)
    const checks = Array.make(hasExport, isTopLevelExport)

    return Array.some(checks, Boolean)
  }

const exportedVariableDeclaration = (node: ts.VariableDeclaration) =>
  pipe(
    node.parent,
    Option.liftPredicate(ts.isVariableDeclarationList),
    Option.map(Struct.get("parent")),
    Option.filter(ts.isVariableStatement),
    Option.filter(variableStatementIsExported(node)),
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

const qualityFindingFromVariableDeclaration = (declaration: ts.VariableDeclaration) => {
  const name = declaration.name as ts.Identifier

  return serviceMethodFinding(name.text)(name)
}

const qualityFromVariableDeclaration =
  (checker: ts.TypeChecker) => (declaration: ts.VariableDeclaration) =>
    pipe(
      Option.fromNullishOr(declaration.initializer),
      Option.filter(variableInitializerNeedsEffectFn(checker)),
      Option.map(() => qualityFindingFromVariableDeclaration(declaration))
    )

const qualityFromVariableNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node),
    Option.flatMap(exportedVariableDeclaration),
    Option.filter(Predicate.not(isPreferEffectFnOverlapShape(context.checker))),
    Option.filter(variableDeclarationNameIsIdentifier),
    Option.flatMap(qualityFromVariableDeclaration(context.checker))
  )

const functionDeclarationHasName = flow(functionDeclarationName, Option.isSome)

const functionDeclarationIsExported = (declaration: ts.FunctionDeclaration) => {
  const hasExport = hasExportModifier(declaration)
  const isTopLevelExport = isTopLevelExportedDeclaration(declaration)
  const checks = Array.make(hasExport, isTopLevelExport)

  return Array.some(checks, Boolean)
}

const identifierNodeFromName = (name: ts.Identifier): ts.Node => name

const evidenceFromFunctionDeclaration = (declaration: ts.FunctionDeclaration) =>
  pipe(
    functionDeclarationName(declaration),
    Option.map(identifierNodeFromName),
    Option.getOrElse(Function.constant(declaration))
  )

const subjectFromFunctionDeclaration = (declaration: ts.FunctionDeclaration) =>
  pipe(
    functionDeclarationName(declaration),
    Option.map(Struct.get("text")),
    Option.getOrElse(Function.constant("function"))
  )

const qualityFindingFromFunctionDeclaration = (declaration: ts.FunctionDeclaration) => {
  const subject = subjectFromFunctionDeclaration(declaration)
  const evidence = evidenceFromFunctionDeclaration(declaration)

  return serviceMethodFinding(subject)(evidence)
}

const qualityFromFunctionNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(node),
    Option.filter(functionDeclarationHasName),
    Option.filter(functionDeclarationIsExported),
    Option.filter(functionLikeReturnsEffect(context.checker)),
    Option.map(qualityFindingFromFunctionDeclaration)
  )

export const exportedEffectFunctionFindings = (
  context: MatchContext,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const fromVariable = qualityFromVariableNode(context)(node)
  const fromFunction = qualityFromFunctionNode(context)(node)
  const candidates = Array.make(fromVariable, fromFunction)

  return pipe(candidates, Array.flatMap(Option.toArray))
}
